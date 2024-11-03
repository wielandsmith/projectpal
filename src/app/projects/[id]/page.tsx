"use client";

import { useRouter } from "next/navigation";

export default function ProjectDetailsPage() {
  const router = useRouter();
  const projectId = router.query.id;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Project Details</h1>
      <p>Viewing details for project ID: {projectId}</p>
      <button
        onClick={() => router.back()}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Go Back
      </button>
    </div>
  );
}
