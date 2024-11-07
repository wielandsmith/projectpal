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
import { lessonTemplates } from '@/lib/templates/lesson-templates';
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
  description: string;
  videoUrl: string;
  imageFile: File | null;
  resources: File[];
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
  title: z.string().min(3, "Title must be at least 3 characters"),
  summary: z.string().min(10, "Summary must be at least 10 characters"),
  introVideoUrl: z.string().url().optional().or(z.literal("")),
  lessons: z.array(z.object({
    title: z.string().min(3, "Lesson title must be at least 3 characters"),
    description: z.string().min(10, "Lesson description must be at least 10 characters"),
    videoUrl: z.string().url().optional().or(z.literal("")),
  }))
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
    lessons: [{ id: crypto.randomUUID(), title: '', description: '', videoUrl: '', imageFile: null, resources: [] }],
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
        resources: []
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
      // Collect all files that need to be uploaded
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

      // Upload all files in batches
      for (const { file, path } of files) {
        await fileUploader.addToQueue(file, path);
      }

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

  // Add lesson template function
  const applyTemplate = (templateId: string) => {
    const template = lessonTemplates.find(t => t.id === templateId);
    if (!template) return;

    setProjectData(prev => ({
      ...prev,
      lessons: [...prev.lessons, {
        id: crypto.randomUUID(),
        ...template.template
      }]
    }));
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

  // Add template customization dialog state
  const [customTemplateDialogOpen, setCustomTemplateDialogOpen] = useState(false);
  const [customTemplate, setCustomTemplate] = useState<{
    name: string;
    category: LessonTemplate['category'];
    description: string;
    template: {
      title: string;
      description: string;
      videoUrl: string;
      imageFile: null;
      resources: never[];
    };
  }>({
    name: '',
    category: 'project',
    description: '',
    template: {
      title: '',
      description: '',
      videoUrl: '',
      imageFile: null,
      resources: [],
    },
  });

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
                <Textarea
                  id="summary"
                  name="summary"
                  value={projectData.summary}
                  onChange={handleInputChange}
                  required
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

              {/* Media Uploads */}
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

              {/* Project Resources */}
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

              {/* Lessons Section */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="lessons">
                  <AccordionTrigger>Project Lessons / Steps</AccordionTrigger>
                  <AccordionContent>
                    {/* Template Management */}
                    <div className="mb-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <Label>Lesson Templates</Label>
                        <Button
                          variant="outline"
                          onClick={() => setCustomTemplateDialogOpen(true)}
                        >
                          Create Template
                        </Button>
                      </div>
                      
                      {/* Template Categories */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(
                          lessonTemplates.reduce((acc, template) => ({
                            ...acc,
                            [template.category]: [
                              ...(acc[template.category] || []),
                              template,
                            ],
                          }), {} as Record<string, typeof lessonTemplates>)
                        ).map(([category, templates]) => (
                          <div key={category} className="space-y-2">
                            <h3 className="font-medium capitalize">{category}</h3>
                            <div className="space-y-1">
                              {templates.map(template => (
                                <Button
                                  key={template.id}
                                  variant="ghost"
                                  className="w-full justify-start text-sm"
                                  onClick={() => applyTemplate(template.id)}
                                >
                                  {template.name}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Lesson List */}
                    <DragDropContext onDragEnd={handleLessonReorder}>
                      <Droppable droppableId="lessons">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef}>
                            {projectData.lessons.map((lesson, index) => (
                              <Draggable
                                key={lesson.id}
                                draggableId={lesson.id}
                                index={index}
                              >
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                  >
                                    <Card className="mb-4">
                                      <CardHeader>
                                        <div className="flex items-center justify-between">
                                          <CardTitle className="text-xl">
                                            Lesson {index + 1}
                                          </CardTitle>
                                          <div className="flex items-center gap-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => duplicateLesson(index)}
                                            >
                                              Duplicate
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => exportLesson(lesson)}
                                            >
                                              Export
                                            </Button>
                                            <div {...provided.dragHandleProps} className="cursor-move">
                                              ⋮
                                            </div>
                                            {/* Preview Button */}
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
                                        {/* Existing lesson fields */}
                                        {/* ... */}
                                        
                                        {/* Validation Errors */}
                                        {lessonErrors[index]?.map((error, i) => (
                                          <p key={i} className="text-sm text-red-500">
                                            {error}
                                          </p>
                                        ))}
                                      </CardContent>
                                      <CardFooter>
                                        <Button
                                          type="button"
                                          variant="destructive"
                                          onClick={() => removeLesson(index)}
                                          disabled={projectData.lessons.length === 1}
                                        >
                                          <Minus className="mr-2 h-4 w-4" /> Remove Lesson
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
                <Textarea
                  id="learningObjectives"
                  name="learningObjectives"
                  placeholder="What will students learn from this project?"
                  value={projectData.learningObjectives}
                  onChange={handleInputChange}
                  className="min-h-[100px]"
                />
              </div>

              {/* Prerequisites */}
              <div className="space-y-2">
                <Label htmlFor="prerequisites">Prerequisites</Label>
                <Textarea
                  id="prerequisites"
                  name="prerequisites"
                  placeholder="What should students know before starting?"
                  value={projectData.prerequisites}
                  onChange={handleInputChange}
                  className="min-h-[100px]"
                />
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
        description="Are you sure you want to create this project? This action cannot be undone."
        confirmText="Create Project"
      />

      {/* Custom Template Dialog */}
      <Dialog open={customTemplateDialogOpen} onOpenChange={setCustomTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Template</DialogTitle>
            <DialogDescription>
              Create a reusable lesson template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={customTemplate.name}
                onChange={(e) => setCustomTemplate(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={customTemplate.category}
                onValueChange={(value: LessonTemplate['category']) => 
                  setCustomTemplate(prev => ({
                    ...prev,
                    category: value
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="experiment">Experiment</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="discussion">Discussion</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={customTemplate.description}
                onChange={(e) => setCustomTemplate(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Template Content</Label>
              <Textarea
                value={customTemplate.template.description}
                onChange={(e) => setCustomTemplate(prev => ({
                  ...prev,
                  template: {
                    ...prev.template,
                    description: e.target.value
                  }
                }))}
                className="min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                const newTemplate = createCustomTemplate(
                  customTemplate.name,
                  customTemplate.category,
                  customTemplate.description,
                  customTemplate.template
                );
                lessonTemplates.push(newTemplate);
                setCustomTemplateDialogOpen(false);
                toast({
                  title: "Template created",
                  description: "Your custom template has been added",
                });
              }}
            >
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
