"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      login(email);
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <FolderOpen className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Thunderlab KB</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Internal knowledge base prototype
          </p>
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Enter a mock email address to access the prototype.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
