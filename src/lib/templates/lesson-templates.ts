export type LessonTemplate = {
  id: string;
  name: string;
  category: 'research' | 'experiment' | 'presentation' | 'discussion' | 'project' | 'assessment';
  description: string;
  template: {
    title: string;
    description: string;
    videoUrl: string;
    imageFile: null;
    resources: [];
  };
};

export const lessonTemplates: LessonTemplate[] = [
  {
    id: 'research',
    name: 'Research & Discovery',
    category: 'research',
    description: 'A template for research-based learning activities',
    template: {
      title: 'Research Phase',
      description: `# Research Goals
1. Understand the topic
2. Gather key information
3. Document findings

# Activities
- Research using provided resources
- Take notes on key findings
- Prepare summary of research`,
      videoUrl: '',
      imageFile: null,
      resources: [],
    },
  },
  {
    id: 'experiment',
    name: 'Hands-on Experiment',
    category: 'experiment',
    description: 'Perfect for science and practical learning activities',
    template: {
      title: 'Experiment Phase',
      description: `# Experiment Setup
1. Materials needed
2. Safety precautions
3. Step-by-step procedure

# Observations
- Record observations
- Document results
- Analyze findings`,
      videoUrl: '',
      imageFile: null,
      resources: [],
    },
  },
  {
    id: 'presentation',
    name: 'Final Presentation',
    category: 'presentation',
    description: 'Template for presenting findings and conclusions',
    template: {
      title: 'Present Your Findings',
      description: `# Presentation Structure
1. Introduction
2. Methods used
3. Results
4. Conclusion

# Deliverables
- Presentation slides
- Supporting materials
- Q&A preparation`,
      videoUrl: '',
      imageFile: null,
      resources: [],
    },
  },
  {
    id: 'discussion',
    name: 'Group Discussion',
    category: 'discussion',
    description: 'Template for collaborative learning sessions',
    template: {
      title: 'Discussion Session',
      description: `# Discussion Topics
1. Main concepts
2. Key questions
3. Group activities

# Format
- Opening statements
- Group discussion
- Summary and conclusions`,
      videoUrl: '',
      imageFile: null,
      resources: [],
    },
  },
  {
    id: 'project',
    name: 'Project Work',
    category: 'project',
    description: 'Template for hands-on project activities',
    template: {
      title: 'Project Development',
      description: `# Project Phases
1. Planning
2. Development
3. Testing
4. Presentation

# Deliverables
- Project plan
- Progress updates
- Final product`,
      videoUrl: '',
      imageFile: null,
      resources: [],
    },
  },
  {
    id: 'assessment',
    name: 'Knowledge Check',
    category: 'assessment',
    description: 'Template for evaluating understanding',
    template: {
      title: 'Assessment Activity',
      description: `# Assessment Components
1. Key concepts review
2. Practice questions
3. Self-evaluation

# Format
- Multiple choice questions
- Short answer responses
- Practical demonstrations`,
      videoUrl: '',
      imageFile: null,
      resources: [],
    },
  },
];

// Helper function to export lesson to JSON
export const exportLessonToJSON = (lesson: any) => {
  return JSON.stringify(lesson, null, 2);
};

// Helper function to validate imported lesson
export const validateImportedLesson = (data: any): boolean => {
  return (
    data &&
    typeof data.title === 'string' &&
    typeof data.description === 'string' &&
    (!data.videoUrl || typeof data.videoUrl === 'string')
  );
};

// Helper function to create custom template
export const createCustomTemplate = (
  name: string,
  category: LessonTemplate['category'],
  description: string,
  template: LessonTemplate['template']
): LessonTemplate => {
  return {
    id: `custom-${Date.now()}`,
    name,
    category,
    description,
    template,
  };
}; 