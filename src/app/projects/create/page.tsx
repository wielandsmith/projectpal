"use client";

import CreateProjectForm from "@/components/projects/CreateProjectForm";

export default function CreateProjectPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Create a New Project</h1>
      <CreateProjectForm />
    </div>
  );
}
