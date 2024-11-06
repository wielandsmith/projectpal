"use client";

import { useState } from 'react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      console.log('Project data submitted:', projectData);
      
      toast({
        title: "Project created successfully!",
        description: "Your new project has been created.",
      });
      
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error creating project",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
                <Input
                  id="featuredImage"
                  name="featuredImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'featuredImage')}
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
    </div>
  );
}
