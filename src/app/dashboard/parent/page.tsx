'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Book, Code, Atom, Palette, PieChart, Globe, MoreHorizontal, User, Calendar, Trophy, MessageSquare, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';

// Mock data (we'll replace this with live data later)
const childrenData = [
  { id: 1, name: 'Emma', grade: '5th Grade', avatar: 'E' },
  { id: 2, name: 'Liam', grade: '3rd Grade', avatar: 'L' },
];

const projectSubjects = [
  { name: 'Math', icon: PieChart, color: 'bg-blue-500' },
  { name: 'Science', icon: Atom, color: 'bg-green-500' },
  { name: 'Coding', icon: Code, color: 'bg-purple-500' },
  { name: 'Art', icon: Palette, color: 'bg-pink-500' },
  { name: 'Literature', icon: Book, color: 'bg-yellow-500' },
  { name: 'Geography', icon: Globe, color: 'bg-indigo-500' },
];

const inProgressProjects = [
  { id: 1, name: 'Build a Robot', subject: 'Science', progress: 65, childName: 'Emma' },
  { id: 2, name: 'Write a Short Story', subject: 'Literature', progress: 40, childName: 'Emma' },
  { id: 3, name: 'Learn Addition', subject: 'Math', progress: 80, childName: 'Liam' },
];

const upcomingEvents = [
  { id: 1, name: 'Parent-Teacher Conference', date: '2023-06-15', childName: 'Emma' },
  { id: 2, name: 'Science Fair', date: '2023-06-20', childName: 'Both' },
  { id: 3, name: 'End of Year Celebration', date: '2023-06-30', childName: 'Both' },
];

const messages = [
  { id: 1, sender: 'Ms. Johnson', subject: 'Emma\'s Progress', preview: 'I wanted to discuss Emma\'s recent...', date: '2023-06-10' },
  { id: 2, sender: 'Mr. Smith', subject: 'Liam\'s Homework', preview: 'Liam has been doing great with his...', date: '2023-06-09' },
];

export default function ParentDashboard() {
  const [selectedChild, setSelectedChild] = useState(childrenData[0]);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);

  const handleProjectAction = (projectId: number, action: string) => {
    console.log(`Performing ${action} on project ${projectId}`);
  };

  const handleNewProject = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    console.log('New project:', Object.fromEntries(formData));
    setIsNewProjectDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 p-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Welcome, Parent!</h1>
          <Avatar className="h-12 w-12">
            <AvatarImage src="https://github.com/shadcn.png" alt="@parent" />
            <AvatarFallback>P</AvatarFallback>
          </Avatar>
        </div>
        <p className="text-gray-600">Here's an overview of your children's progress</p>
      </header>

      <Tabs defaultValue={selectedChild.id.toString()} className="space-y-8">
        <TabsList>
          {childrenData.map((child) => (
            <TabsTrigger
              key={child.id}
              value={child.id.toString()}
              onClick={() => setSelectedChild(child)}
            >
              {child.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {childrenData.map((child) => (
          <TabsContent key={child.id} value={child.id.toString()}>
            <main className="space-y-8">
              {/* Stats Section */}
              <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Student Info</CardTitle>
                    <User className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{child.name}</div>
                    <p className="text-xs text-muted-foreground">{child.grade}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Projects Completed</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">7</div>
                    <p className="text-xs text-muted-foreground">+2 from last month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">3</div>
                    <p className="text-xs text-muted-foreground">View calendar for details</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">New Messages</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">2</div>
                    <p className="text-xs text-muted-foreground">1 unread message</p>
                  </CardContent>
                </Card>
              </section>

              {/* Projects Section */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold text-gray-800">Projects in Progress</h2>
                  <Link href="/projects/create">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" /> New Project
                    </Button>
                  </Link>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {inProgressProjects
                    .filter(project => project.childName === child.name)
                    .map((project) => (
                      <motion.div 
                        key={project.id} 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium">{project.name}</CardTitle>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleProjectAction(project.id, 'view')}>
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleProjectAction(project.id, 'message')}>
                                  Message Teacher
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </CardHeader>
                          <CardContent>
                            <CardDescription>{project.subject}</CardDescription>
                            <Progress value={project.progress} className="mt-2" />
                            <p className="text-sm text-gray-500 mt-2">{project.progress}% Complete</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                  ))}
                </div>
              </section>

              {/* Messages Section */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Messages</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {messages.map((message) => (
                    <motion.div 
                      key={message.id} 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card>
                        <CardHeader>
                          <CardTitle>{message.subject}</CardTitle>
                          <CardDescription>From: {message.sender}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">{message.preview}</p>
                        </CardContent>
                        <CardFooter>
                          <p className="text-xs text-gray-400">{message.date}</p>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Events Section */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Upcoming Events</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingEvents
                    .filter(event => event.childName === child.name || event.childName === 'Both')
                    .map((event) => (
                      <motion.div 
                        key={event.id} 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card>
                          <CardHeader>
                            <CardTitle>{event.name}</CardTitle>
                            <CardDescription>{new Date(event.date).toLocaleDateString()}</CardDescription>
                          </CardHeader>
                        </Card>
                      </motion.div>
                  ))}
                </div>
              </section>

              {/* Subject Overview */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Subject Overview</h2>
                <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6">
                  {projectSubjects.map((subject, index) => (
                    <motion.div 
                      key={subject.name} 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="hover:shadow-lg transition-shadow duration-300">
                        <CardContent className="flex flex-col items-center justify-center p-6">
                          <div className={`rounded-full p-3 ${subject.color}`}>
                            <subject.icon className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="mt-3 font-medium text-gray-800">{subject.name}</h3>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </section>
            </main>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
} 