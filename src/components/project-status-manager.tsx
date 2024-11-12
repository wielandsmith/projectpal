'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  updateProjectStatus, 
  publishProject, 
  archiveProject,
  validateProjectForPublishing 
} from '@/app/actions/project-status';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProjectStatusManagerProps {
  projectId: string;
  currentStatus: 'draft' | 'published' | 'archived';
  onStatusChange?: (newStatus: 'draft' | 'published' | 'archived') => void;
}

export function ProjectStatusManager({ 
  projectId, 
  currentStatus,
  onStatusChange 
}: ProjectStatusManagerProps) {
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handlePublish = async () => {
    setIsValidating(true);
    try {
      const { isValid, errors } = await validateProjectForPublishing(projectId);
      if (!isValid) {
        setValidationErrors(errors);
        return;
      }

      const result = await publishProject(projectId);
      if (result.success) {
        toast({
          title: "Project Published",
          description: "Your project is now live and visible to students.",
        });
        onStatusChange?.('published');
      } else {
        setValidationErrors(result.errors);
      }
    } catch (error) {
      toast({
        title: "Error Publishing Project",
        description: "Failed to publish project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
      setShowPublishDialog(false);
    }
  };

  const handleArchive = async () => {
    try {
      const result = await archiveProject(projectId);
      if (result.success) {
        toast({
          title: "Project Archived",
          description: "Your project has been archived.",
        });
        onStatusChange?.('archived');
      }
    } catch (error) {
      toast({
        title: "Error Archiving Project",
        description: "Failed to archive project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowArchiveDialog(false);
    }
  };

  const handleStatusChange = async (newStatus: 'draft' | 'published' | 'archived') => {
    try {
      await updateProjectStatus(projectId, newStatus);
      toast({
        title: "Status Updated",
        description: `Project status changed to ${newStatus}.`,
      });
      onStatusChange?.(newStatus);
    } catch (error) {
      toast({
        title: "Error Updating Status",
        description: "Failed to update project status. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Status:</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          currentStatus === 'published' ? 'bg-green-100 text-green-800' :
          currentStatus === 'draft' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {currentStatus === 'draft' && (
          <Button
            onClick={() => setShowPublishDialog(true)}
            disabled={isValidating}
          >
            {isValidating ? 'Validating...' : 'Publish'}
          </Button>
        )}
        {currentStatus === 'published' && (
          <Button
            variant="outline"
            onClick={() => handleStatusChange('draft')}
          >
            Unpublish
          </Button>
        )}
        {currentStatus !== 'archived' && (
          <Button
            variant="destructive"
            onClick={() => setShowArchiveDialog(true)}
          >
            Archive
          </Button>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Cannot Publish Project</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-2">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Project</AlertDialogTitle>
            <AlertDialogDescription>
              This will make your project visible to students. Are you sure you want to publish?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Project</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the project and make it inaccessible to students. 
              You can restore it later. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 