"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Minus, Upload, ChevronLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/components/ui/use-toast";
import { FilePreview } from "@/components/ui/file-preview";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Progress } from "@/components/ui/progress";
import { z } from "zod";
import { useDropzone } from 'react-dropzone';
import { FileDropZone } from '@/components/ui/file-drop-zone';
import { useDebounce } from '@/hooks/use-debounce';
import { FileProcessor } from '@/lib/utils/file-processor';
import { FileUploader } from '@/lib/utils/file-uploader';
import { UploadProgressDetails } from '@/lib/utils/file-uploader';
import { UploadPriority, UploadError } from '@/lib/utils/file-uploader';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Markdown } from "@/components/ui/markdown";
import { saveAs } from 'file-saver';
import { 
  exportLessonToJSON, 
  validateImportedLesson, 
  createCustomTemplate,
  LessonTemplate
} from '@/lib/templates/lesson-templates';
import dynamic from 'next/dynamic';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { createProject } from '@/app/actions/projects';

const DragDropContext = dynamic(
  () => import('react-beautiful-dnd').then(mod => mod.DragDropContext),
  { ssr: false }
);
const Droppable = dynamic(
  () => import('react-beautiful-dnd').then(mod => mod.Droppable),
  { ssr: false }
);
const Draggable = dynamic(
  () => import('react-beautiful-dnd').then(mod => mod.Draggable),
  { ssr: false }
);

type Lesson = {
  id: string;
  title: string;
  summary: string;
  description: string;
  videoUrl: string;
  imageFile: File | null;
  resources: File[];
  documentation: string;
  estimatedDuration: number;
  durationUnit: 'minutes' | 'hours';
}

type ProjectData = {
  title: string;
  summary: string;
  featuredImage: File | null;
  introVideoUrl: string;
  materials: File[];
  resources: File[];
  lessons: Lesson[];
  subject: 'math' | 'science' | 'history' | 'geography' | 'reading' | 'art';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  durationUnit: 'minutes' | 'hours' | 'days' | 'weeks';
  learningObjectives: string;
  prerequisites: string;
}

// Validation schema
const projectSchema = z.object({
  title: z.string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be less than 100 characters"),
  summary: z.string()
    .min(10, "Summary must be at least 10 characters")
    .max(5000, "Summary must be less than 5000 characters"),
  subject: z.enum(['math', 'science', 'history', 'geography', 'reading', 'art'], {
    required_error: "Please select a subject",
  }),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced'], {
    required_error: "Please select a difficulty level",
  }),
  estimatedDuration: z.number()
    .min(1, "Duration must be at least 1")
    .max(999, "Duration must be less than 999"),
  durationUnit: z.enum(['minutes', 'hours', 'days', 'weeks']),
  learningObjectives: z.string()
    .min(10, "Learning objectives must be at least 10 characters"),
  prerequisites: z.string()
    .optional(),
  lessons: z.array(z.object({
    title: z.string()
      .min(3, "Lesson title must be at least 3 characters")
      .max(100, "Lesson title must be less than 100 characters"),
    description: z.string()
      .min(10, "Lesson description must be at least 10 characters")
      .max(5000, "Description must be less than 5000 characters"),
    videoUrl: z.string().url().optional().or(z.literal("")),
  })).min(1, "At least one lesson is required"),
});

// File validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif']
};
const ACCEPTED_DOCUMENT_TYPES = {
  'application/pdf': ['.pdf']
};

// Add lesson validation schema
const lessonSchema = z.object({
  title: z.string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be less than 100 characters"),
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must be less than 5000 characters"),
  videoUrl: z.string().url().optional().or(z.literal("")),
  resources: z.array(z.any()).max(5, "Maximum 5 resources allowed per lesson"),
});

export default function CreateProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [projectData, setProjectData] = useState<ProjectData>({
    title: '',
    summary: '',
    featuredImage: null,
    introVideoUrl: '',
    materials: [],
    resources: [],
    lessons: [{
      id: crypto.randomUUID(),
      title: '',
      summary: '',
      description: '',
      videoUrl: '',
      imageFile: null,
      resources: [],
      documentation: '',
      estimatedDuration: 0,
      durationUnit: 'minutes'
    }],
    subject: 'math',
    difficulty: 'beginner',
    estimatedDuration: 0,
    durationUnit: 'hours',
    learningObjectives: '',
    prerequisites: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null);
  const [fileProcessor] = useState(() => new FileProcessor());
  const [uploadStatus, setUploadStatus] = useState<UploadProgressDetails | null>(null);
  const [fileUploader] = useState(() => new FileUploader({
    onProgress: (progress) => setUploadProgress(progress),
    onDetailedProgress: (details) => setUploadStatus(details),
    maxBandwidth: Infinity,
    priorityWeights: {
      high: 3,
      medium: 2,
      low: 1,
    },
  }));
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
  const [bandwidthLimit, setBandwidthLimit] = useState<number>(Infinity);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const [lessonErrors, setLessonErrors] = useState<Record<string, string[]>>({});
  
  // Debounce project data changes for auto-save
  const debouncedProjectData = useDebounce(projectData, 1000);

  // Add these state variables
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Auto-save effect
  useEffect(() => {
    const autoSave = async () => {
      if (!debouncedProjectData.title) return;
      
      try {
        setAutoSaveStatus('saving');
        // Save current version as previous before updating
        const currentDraft = localStorage.getItem('draft-project');
        if (currentDraft) {
          localStorage.setItem('previous-draft-project', currentDraft);
        }
        // Save new version
        localStorage.setItem('draft-project', JSON.stringify(debouncedProjectData));
        setAutoSaveStatus('saved');
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('error');
      }
    };

    autoSave();
  }, [debouncedProjectData]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('draft-project');
    if (draft) {
      try {
        setProjectData(JSON.parse(draft));
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, []);

  const [isFormDirty, setIsFormDirty] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFormDirty]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProjectData(prev => ({ ...prev, [name]: value }));
    setIsFormDirty(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof ProjectData) => {
    const files = e.target.files;
    if (files) {
      if (field === 'featuredImage') {
        setProjectData(prev => ({ ...prev, [field]: files[0] }));
      } else {
        setProjectData(prev => ({ ...prev, [field]: [...prev[field as 'materials' | 'resources'], ...Array.from(files)] }));
      }
    }
  };

  const handleLessonChange = (index: number, field: keyof Lesson, value: string | File | File[]) => {
    setProjectData(prev => ({
      ...prev,
      lessons: prev.lessons.map((lesson, i) => 
        i === index ? { ...lesson, [field]: value } : lesson
      )
    }));
  };

  const addLesson = () => {
    setProjectData(prev => ({
      ...prev,
      lessons: [...prev.lessons, {
        id: crypto.randomUUID(),
        title: '',
        description: '',
        videoUrl: '',
        imageFile: null,
        resources: [],
        documentation: '',
        estimatedDuration: 0,
        durationUnit: 'minutes'
      }]
    }));
  };

  const removeLesson = (index: number) => {
    setProjectData(prev => ({
      ...prev,
      lessons: prev.lessons.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    try {
      projectSchema.parse(projectData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            newErrors[err.path.join(".")] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmedSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmDialog(false);
    
    try {
      // Upload files first
      const files = [
        { file: projectData.featuredImage, path: `featured/${Date.now()}-${projectData.featuredImage?.name}` },
        ...projectData.materials.map(file => ({
          file,
          path: `materials/${Date.now()}-${file.name}`
        })),
        ...projectData.resources.map(file => ({
          file,
          path: `resources/${Date.now()}-${file.name}`
        })),
        ...projectData.lessons.flatMap(lesson => [
          lesson.imageFile && {
            file: lesson.imageFile,
            path: `lessons/${Date.now()}-${lesson.imageFile.name}`
          },
          ...lesson.resources.map(file => ({
            file,
            path: `lessons/resources/${Date.now()}-${file.name}`
          }))
        ]).filter(Boolean)
      ].filter((item): item is { file: File; path: string } => item?.file != null);

      // Upload all files
      for (const { file, path } of files) {
        await fileUploader.addToQueue(file, path);
      }

      // Create project in database
      await createProject(projectData);

      toast({
        title: "Project created successfully!",
        description: "Your new project has been created.",
      });
      
      localStorage.removeItem('draft-project');
      setIsFormDirty(false);
      router.push('/dashboard/parent');
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error creating project",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const pauseUpload = () => {
    fileUploader.pause();
  };

  const resumeUpload = () => {
    fileUploader.resume();
  };

  const cancelUpload = () => {
    fileUploader.cancel();
    setIsSubmitting(false);
    setUploadProgress(0);
    setUploadStatus(null);
  };

  const validateFile = (file: File) => {
    const errors: string[] = [];
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File ${file.name} is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check file type
    if (file.type.startsWith('image/')) {
      if (!Object.keys(ACCEPTED_IMAGE_TYPES).includes(file.type)) {
        errors.push(`File ${file.name} has invalid image type`);
      }
    } else if (file.type === 'application/pdf') {
      // Additional PDF validation if needed
    } else {
      errors.push(`File ${file.name} has unsupported type`);
    }

    return errors;
  };

  const handleFileSelect = async (files: File[], field: keyof ProjectData, priority: UploadPriority = 'medium') => {
    // Validate all files first
    const allErrors: string[] = files.flatMap(validateFile);
    
    if (allErrors.length > 0) {
      toast({
        title: "File validation failed",
        description: allErrors[0],
        variant: "destructive",
      });
      return;
    }

    try {
      const processedFiles = await Promise.all(
        files.map(file => fileProcessor.processFile(file, field))
      );

      for (const file of processedFiles) {
        const path = `${field}/${Date.now()}-${file.name}`;
        await fileUploader.addToQueue(file, path, priority);
      }
    } catch (error) {
      console.error('File processing failed:', error);
      toast({
        title: "Error processing files",
        description: "Failed to process uploaded files",
        variant: "destructive",
      });
    }
  };

  // Add bandwidth control
  const handleBandwidthChange = (value: number) => {
    setBandwidthLimit(value * 1024 * 1024); // Convert MB/s to bytes/s
    fileUploader.setBandwidthLimit(value * 1024 * 1024);
  };

  // Add error handling
  useEffect(() => {
    const interval = setInterval(() => {
      const errors = fileUploader.getErrors();
      setUploadErrors(errors);
    }, 1000);

    return () => clearInterval(interval);
  }, [fileUploader]);

  // Add lesson reordering function
  const handleLessonReorder = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(projectData.lessons);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setProjectData(prev => ({ ...prev, lessons: items }));
    setIsFormDirty(true);
  };

  // Add lesson validation function
  const validateLesson = (lesson: Lesson, index: number) => {
    try {
      lessonSchema.parse(lesson);
      const newErrors = { ...lessonErrors };
      delete newErrors[index];
      setLessonErrors(newErrors);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setLessonErrors(prev => ({
          ...prev,
          [index]: error.errors.map(e => e.message)
        }));
      }
      return false;
    }
  };

  // Add template management functions
  const duplicateLesson = (index: number) => {
    const lessonToDuplicate = projectData.lessons[index];
    const duplicatedLesson = {
      ...lessonToDuplicate,
      id: crypto.randomUUID(),
      title: `${lessonToDuplicate.title} (Copy)`,
    };
    
    setProjectData(prev => ({
      ...prev,
      lessons: [
        ...prev.lessons.slice(0, index + 1),
        duplicatedLesson,
        ...prev.lessons.slice(index + 1),
      ],
    }));
    setIsFormDirty(true);
  };

  const exportLesson = (lesson: Lesson) => {
    const jsonString = exportLessonToJSON(lesson);
    const blob = new Blob([jsonString], { type: 'application/json' });
    saveAs(blob, `lesson-${lesson.title.toLowerCase().replace(/\s+/g, '-')}.json`);
  };

  const importLesson = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!validateImportedLesson(data)) {
        throw new Error('Invalid lesson format');
      }

      setProjectData(prev => ({
        ...prev,
        lessons: [...prev.lessons, { ...data, id: crypto.randomUUID() }],
      }));
      setIsFormDirty(true);

      toast({
        title: "Lesson imported successfully",
        description: "The lesson has been added to your project",
      });
    } catch (error) {
      toast({
        title: "Error importing lesson",
        description: "Failed to import lesson. Please check the file format.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-blue-100 to-purple-100 p-8">
      {/* Navigation - Simplified */}
      <div className="max-w-4xl mx-auto mb-6">
        <Link href="/dashboard/parent">
          <Button variant="ghost" className="gap-2">
            <ChevronLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
              Create New Project
            </CardTitle>
            <CardDescription className="text-center">
              Fill in the details below to create your new learning project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Auto-save status */}
              <div className="text-sm text-gray-500 text-right">
                {autoSaveStatus === 'saving' && 'Saving...'}
                {autoSaveStatus === 'saved' && 'All changes saved'}
                {autoSaveStatus === 'error' && 'Failed to save changes'}
              </div>

              {/* Project Basic Info */}
              <div id="basic-info" className="space-y-6">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="title">Project Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={projectData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Project Summary</Label>
                  <RichTextEditor
                    value={projectData.summary}
                    onChange={(value) => {
                      setProjectData(prev => ({ ...prev, summary: value }));
                      setIsFormDirty(true);
                    }}
                    placeholder="Enter project summary..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select
                    value={projectData.subject}
                    onValueChange={(value) => setProjectData(prev => ({ ...prev, subject: value as typeof prev.subject }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="math">Mathematics</SelectItem>
                      <SelectItem value="science">Science</SelectItem>
                      <SelectItem value="history">History</SelectItem>
                      <SelectItem value="geography">Geography</SelectItem>
                      <SelectItem value="reading">Reading</SelectItem>
                      <SelectItem value="art">Art</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Media Section */}
              <div id="media" className="space-y-6">
                <h3 className="text-lg font-medium">Media & Resources</h3>
                <div className="space-y-2">
                  <Label htmlFor="featuredImage">Featured Image</Label>
                  <FileDropZone
                    onFileSelect={(files) => handleFileSelect(files, 'featuredImage')}
                    accept={ACCEPTED_IMAGE_TYPES}
                    maxSize={MAX_FILE_SIZE}
                    maxFiles={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="introVideoUrl">Introduction Video URL</Label>
                  <Input
                    id="introVideoUrl"
                    name="introVideoUrl"
                    type="url"
                    value={projectData.introVideoUrl}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="materials">Project Materials (PDFs)</Label>
                  <Input
                    id="materials"
                    name="materials"
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={(e) => handleFileChange(e, 'materials')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resources">Additional Resources (PDFs)</Label>
                  <Input
                    id="resources"
                    name="resources"
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={(e) => handleFileChange(e, 'resources')}
                  />
                </div>
              </div>

              {/* Lessons Section */}
              <div id="lessons" className="space-y-6">
                <h3 className="text-lg font-medium">Lessons & Steps</h3>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="lessons">
                    <AccordionTrigger>Project Lessons / Steps</AccordionTrigger>
                    <AccordionContent>
                      {/* Lesson List */}
                      <DragDropContext onDragEnd={handleLessonReorder}>
                        <Droppable 
                          droppableId="lessons" 
                          isDropDisabled={false}
                          isCombineEnabled={false}
                          ignoreContainerClipping={false}
                        >
                          {(provided) => (
                            <div 
                              {...provided.droppableProps} 
                              ref={provided.innerRef}
                              className="space-y-4"
                            >
                              {projectData.lessons.map((lesson, index) => (
                                <Draggable
                                  key={lesson.id}
                                  draggableId={lesson.id}
                                  index={index}
                                  isDragDisabled={false}
                                >
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="relative"
                                    >
                                      <Card className="mb-4">
                                        <CardHeader>
                                          <div className="flex items-center justify-between">
                                            <CardTitle className="text-xl">
                                              Step {index + 1}
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                              <div {...provided.dragHandleProps} className="cursor-move">
                                                ⋮
                                              </div>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setPreviewLesson(lesson)}
                                              >
                                                Preview
                                              </Button>
                                            </div>
                                          </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                          {/* Title */}
                                          <div className="space-y-2">
                                            <Label>Step Title</Label>
                                            <Input
                                              value={lesson.title}
                                              onChange={(e) => handleLessonChange(index, 'title', e.target.value)}
                                              placeholder="Enter step title..."
                                            />
                                          </div>

                                          {/* Summary */}
                                          <div className="space-y-2">
                                            <Label>Summary</Label>
                                            <Textarea
                                              value={lesson.summary}
                                              onChange={(e) => handleLessonChange(index, 'summary', e.target.value)}
                                              placeholder="Brief summary of this step..."
                                            />
                                          </div>

                                          {/* Detailed Description */}
                                          <div className="space-y-2">
                                            <Label>Detailed Description</Label>
                                            <RichTextEditor
                                              value={lesson.description}
                                              onChange={(value) => handleLessonChange(index, 'description', value)}
                                              placeholder="Detailed step-by-step instructions..."
                                            />
                                          </div>

                                          {/* Featured Media */}
                                          <div className="space-y-4">
                                            <div className="space-y-2">
                                              <Label>Featured Image</Label>
                                              <FileDropZone
                                                onFileSelect={(files) => handleLessonChange(index, 'imageFile', files[0])}
                                                accept={ACCEPTED_IMAGE_TYPES}
                                                maxSize={MAX_FILE_SIZE}
                                                maxFiles={1}
                                              />
                                              {lesson.imageFile && (
                                                <FilePreview
                                                  file={lesson.imageFile}
                                                  onRemove={() => handleLessonChange(index, 'imageFile', null)}
                                                />
                                              )}
                                            </div>

                                            <div className="space-y-2">
                                              <Label>Video URL</Label>
                                              <Input
                                                type="url"
                                                value={lesson.videoUrl}
                                                onChange={(e) => handleLessonChange(index, 'videoUrl', e.target.value)}
                                                placeholder="Enter video URL..."
                                              />
                                            </div>
                                          </div>

                                          {/* Documentation */}
                                          <div className="space-y-2">
                                            <Label>Documentation</Label>
                                            <RichTextEditor
                                              value={lesson.documentation}
                                              onChange={(value) => handleLessonChange(index, 'documentation', value)}
                                              placeholder="Additional documentation, notes, or resources..."
                                            />
                                          </div>

                                          {/* Duration */}
                                          <div className="space-y-2">
                                            <Label>Estimated Duration</Label>
                                            <div className="flex gap-2">
                                              <Input
                                                type="number"
                                                min="0"
                                                value={lesson.estimatedDuration}
                                                onChange={(e) => handleLessonChange(index, 'estimatedDuration', parseInt(e.target.value))}
                                                className="w-24"
                                              />
                                              <Select
                                                value={lesson.durationUnit}
                                                onValueChange={(value) => handleLessonChange(index, 'durationUnit', value)}
                                              >
                                                <SelectTrigger className="w-[110px]">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="minutes">Minutes</SelectItem>
                                                  <SelectItem value="hours">Hours</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </div>

                                          {/* Resources */}
                                          <div className="space-y-2">
                                            <Label>Step Resources</Label>
                                            <FileDropZone
                                              onFileSelect={(files) => handleLessonChange(index, 'resources', [...lesson.resources, ...files])}
                                              accept={ACCEPTED_DOCUMENT_TYPES}
                                              maxSize={MAX_FILE_SIZE}
                                              maxFiles={5}
                                            />
                                            {lesson.resources.map((file, fileIndex) => (
                                              <FilePreview
                                                key={fileIndex}
                                                file={file}
                                                onRemove={() => {
                                                  const newResources = [...lesson.resources];
                                                  newResources.splice(fileIndex, 1);
                                                  handleLessonChange(index, 'resources', newResources);
                                                }}
                                              />
                                            ))}
                                          </div>
                                        </CardContent>
                                        <CardFooter className="flex justify-between">
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={() => removeLesson(index)}
                                            disabled={projectData.lessons.length === 1}
                                          >
                                            <Minus className="mr-2 h-4 w-4" /> Remove Step
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => duplicateLesson(index)}
                                          >
                                            Duplicate Step
                                          </Button>
                                        </CardFooter>
                                      </Card>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>

                      {/* Import Lesson Button */}
                      <div className="flex gap-2 mt-4">
                        <Button type="button" onClick={addLesson}>
                          <Plus className="mr-2 h-4 w-4" /> Add Lesson
                        </Button>
                        <Input
                          type="file"
                          accept=".json"
                          className="hidden"
                          id="import-lesson"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) importLesson(file);
                          }}
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('import-lesson')?.click()}
                        >
                          Import Lesson
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Lesson Preview Dialog */}
              <Dialog open={!!previewLesson} onOpenChange={() => setPreviewLesson(null)}>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>{previewLesson?.title}</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[600px]">
                    <div className="space-y-4 p-4">
                      {previewLesson?.imageFile && (
                        <div className="relative w-full h-48">
                          <img
                            src={URL.createObjectURL(previewLesson.imageFile)}
                            alt={previewLesson.title}
                            className="object-cover rounded-lg"
                          />
                        </div>
                      )}
                      <Markdown>{previewLesson?.description || ''}</Markdown>
                      {previewLesson?.videoUrl && (
                        <div className="aspect-video">
                          <iframe
                            src={previewLesson.videoUrl}
                            className="w-full h-full"
                            allowFullScreen
                          />
                        </div>
                      )}
                      {previewLesson?.resources?.length > 0 && (
                        <div>
                          <h3 className="font-medium mb-2">Resources</h3>
                          <ul className="list-disc pl-5">
                            {previewLesson?.resources?.map((file, i) => (
                              <li key={i}>{file.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              {/* Add error messages */}
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title}</p>
              )}

              {/* Add file previews */}
              {projectData.featuredImage && (
                <FilePreview
                  file={projectData.featuredImage}
                  onRemove={() => setProjectData(prev => ({ ...prev, featuredImage: null }))}
                  className="mt-2"
                />
              )}

              {/* Upload progress with detailed status and controls */}
              {isSubmitting && uploadStatus && (
                <div className="space-y-4 p-4 border rounded-lg bg-white/50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Uploading {uploadStatus.currentFileName}
                    </span>
                    <div className="space-x-2">
                      {uploadStatus.status === 'uploading' ? (
                        <Button size="sm" variant="outline" onClick={pauseUpload}>
                          Pause
                        </Button>
                      ) : uploadStatus.status === 'paused' ? (
                        <Button size="sm" variant="outline" onClick={resumeUpload}>
                          Resume
                        </Button>
                      ) : null}
                      <Button size="sm" variant="destructive" onClick={cancelUpload}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                  
                  <Progress value={uploadStatus.currentFileProgress} />
                  
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>
                      {uploadStatus.uploadedFiles} of {uploadStatus.totalFiles} files
                    </span>
                    <span>
                      {Math.round(uploadStatus.overallProgress)}% complete
                    </span>
                  </div>

                  {/* Add speed and time remaining */}
                  {uploadStatus.speed && uploadStatus.estimatedTimeRemaining && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>
                        {(uploadStatus.speed / 1024 / 1024).toFixed(1)} MB/s
                      </span>
                      <span>
                        {uploadStatus.estimatedTimeRemaining > 60
                          ? `${Math.ceil(uploadStatus.estimatedTimeRemaining / 60)} minutes remaining`
                          : `${Math.ceil(uploadStatus.estimatedTimeRemaining)} seconds remaining`}
                      </span>
                    </div>
                  )}
                  
                  {uploadStatus.status === 'error' && (
                    <p className="text-sm text-red-500">
                      Upload failed. Will retry automatically...
                    </p>
                  )}
                </div>
              )}

              {/* Bandwidth Control */}
              <div className="space-y-2">
                <Label>Upload Speed Limit (MB/s)</Label>
                <Select
                  value={String(bandwidthLimit / 1024 / 1024)}
                  onValueChange={(value) => handleBandwidthChange(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select speed limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Infinity">Unlimited</SelectItem>
                    <SelectItem value="1">1 MB/s</SelectItem>
                    <SelectItem value="2">2 MB/s</SelectItem>
                    <SelectItem value="5">5 MB/s</SelectItem>
                    <SelectItem value="10">10 MB/s</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Error Display */}
              {uploadErrors.length > 0 && (
                <div className="space-y-2 p-4 border rounded-lg bg-red-50">
                  <h3 className="font-medium text-red-900">Upload Errors</h3>
                  <div className="space-y-1">
                    {uploadErrors.map((error, index) => (
                      <div key={index} className="text-sm text-red-800">
                        <p className="font-medium">{error.code}</p>
                        <p>{error.message}</p>
                        <p className="text-xs text-red-600">
                          {new Date(error.timestamp).toLocaleString()} 
                          (Retry #{error.retryCount})
                        </p>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileUploader.clearErrors()}
                  >
                    Clear Errors
                  </Button>
                </div>
              )}

              {/* Draft Saving Indicator */}
              <div className="flex justify-between items-center text-sm text-gray-500 mb-6">
                <div>
                  {autoSaveStatus === 'saving' && 'Saving draft...'}
                  {autoSaveStatus === 'saved' && 'Draft saved'}
                  {autoSaveStatus === 'error' && 'Failed to save draft'}
                </div>
                {autoSaveStatus === 'saved' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const previousDraft = localStorage.getItem('previous-draft-project');
                      if (previousDraft) {
                        setProjectData(JSON.parse(previousDraft));
                        toast({
                          title: "Draft restored",
                          description: "Previous version restored successfully",
                        });
                      }
                    }}
                  >
                    Undo Changes
                  </Button>
                )}
              </div>

              {/* Settings Section */}
              <div id="settings" className="space-y-6">
                <h3 className="text-lg font-medium">Project Settings</h3>
                
                {/* Difficulty Level */}
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select
                    value={projectData.difficulty}
                    onValueChange={(value) => {
                      setProjectData(prev => ({ ...prev, difficulty: value as typeof prev.difficulty }));
                      setIsFormDirty(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Estimated Duration */}
                <div className="space-y-2">
                  <Label htmlFor="estimatedDuration">Estimated Duration</Label>
                  <div className="flex gap-2">
                    <Input
                      id="estimatedDuration"
                      name="estimatedDuration"
                      type="number"
                      min="1"
                      placeholder="Duration"
                      value={projectData.estimatedDuration}
                      onChange={handleInputChange}
                      className="w-32"
                    />
                    <Select
                      value={projectData.durationUnit}
                      onValueChange={(value) => {
                        setProjectData(prev => ({ ...prev, durationUnit: value as typeof prev.durationUnit }));
                        setIsFormDirty(true);
                      }}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Learning Objectives */}
                <div className="space-y-2">
                  <Label htmlFor="learningObjectives">Learning Objectives</Label>
                  <RichTextEditor
                    value={projectData.learningObjectives}
                    onChange={(value) => {
                      setProjectData(prev => ({ ...prev, learningObjectives: value }));
                      setIsFormDirty(true);
                    }}
                    placeholder="What will students learn from this project?"
                  />
                </div>

                {/* Prerequisites */}
                <div className="space-y-2">
                  <Label htmlFor="prerequisites">Prerequisites</Label>
                  <RichTextEditor
                    value={projectData.prerequisites}
                    onChange={(value) => {
                      setProjectData(prev => ({ ...prev, prerequisites: value }));
                      setIsFormDirty(true);
                    }}
                    placeholder="What should students know before starting?"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span> Creating Project...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" /> Create Project
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleConfirmedSubmit}
        title="Create Project"
        description={
          <div className="space-y-2">
            <p>Are you sure you want to create this project?</p>
            <div className="rounded-md bg-muted p-3">
              <h4 className="font-medium">Project Summary:</h4>
              <ul className="list-disc pl-4 space-y-1 text-sm">
                <li>Title: {projectData.title}</li>
                <li>Subject: {projectData.subject}</li>
                <li>Difficulty: {projectData.difficulty}</li>
                <li>Duration: {projectData.estimatedDuration} {projectData.durationUnit}</li>
                <li>Lessons: {projectData.lessons.length}</li>
                <li>Files to upload: {[
                  projectData.featuredImage,
                  ...projectData.materials,
                  ...projectData.resources,
                  ...projectData.lessons.flatMap(l => [l.imageFile, ...l.resources])
                ].filter(Boolean).length}</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          </div>
        }
        confirmText="Create Project"
      />

      {/* Section Navigation */}
      <nav className="fixed right-4 top-1/2 -translate-y-1/2 space-y-2 bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-lg">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sm"
          onClick={() => document.getElementById('basic-info')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          Basic Info
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sm"
          onClick={() => document.getElementById('media')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          Media
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sm"
          onClick={() => document.getElementById('lessons')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          Lessons
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sm"
          onClick={() => document.getElementById('settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          Settings
        </Button>
      </nav>
    </div>
  );
}
