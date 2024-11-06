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

type Lesson = {
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
    lessons: [{ title: '', description: '', videoUrl: '', imageFile: null, resources: [] }]
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
  
  // Debounce project data changes for auto-save
  const debouncedProjectData = useDebounce(projectData, 1000);

  // Auto-save effect
  useEffect(() => {
    const autoSave = async () => {
      if (!debouncedProjectData.title) return; // Don't save empty projects
      
      try {
        setAutoSaveStatus('saving');
        // Save to localStorage for now (replace with API call later)
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProjectData(prev => ({ ...prev, [name]: value }));
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
      lessons: [...prev.lessons, { title: '', description: '', videoUrl: '', imageFile: null, resources: [] }]
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
                    {projectData.lessons.map((lesson, index) => (
                      <Card key={index} className="mb-4">
                        <CardHeader>
                          <CardTitle className="text-xl">Lesson {index + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Lesson Fields */}
                          <div className="space-y-2">
                            <Label htmlFor={`lesson-${index}-title`}>Lesson Title</Label>
                            <Input
                              id={`lesson-${index}-title`}
                              value={lesson.title}
                              onChange={(e) => handleLessonChange(index, 'title', e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`lesson-${index}-description`}>Lesson Description</Label>
                            <Textarea
                              id={`lesson-${index}-description`}
                              value={lesson.description}
                              onChange={(e) => handleLessonChange(index, 'description', e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`lesson-${index}-video`}>Lesson Video URL</Label>
                            <Input
                              id={`lesson-${index}-video`}
                              type="url"
                              value={lesson.videoUrl}
                              onChange={(e) => handleLessonChange(index, 'videoUrl', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`lesson-${index}-image`}>Lesson Image</Label>
                            <Input
                              id={`lesson-${index}-image`}
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleLessonChange(index, 'imageFile', file);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`lesson-${index}-resources`}>Lesson Resources (PDFs)</Label>
                            <Input
                              id={`lesson-${index}-resources`}
                              type="file"
                              accept=".pdf"
                              multiple
                              onChange={(e) => {
                                const files = e.target.files;
                                if (files) handleLessonChange(index, 'resources', Array.from(files));
                              }}
                            />
                          </div>
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
                    ))}
                    <Button type="button" onClick={addLesson} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" /> Add Lesson
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

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
    </div>
  );
}
