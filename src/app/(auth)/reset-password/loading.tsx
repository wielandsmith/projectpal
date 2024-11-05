import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordLoading() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mx-auto" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-full bg-gray-200 rounded animate-pulse mt-6" />
        </div>
      </CardContent>
    </Card>
  );
} 