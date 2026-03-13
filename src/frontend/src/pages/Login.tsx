import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Moon, Store, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { AppRole } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useSaveCallerProfile } from "../hooks/useQueries";

interface LoginProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Login({ isDark, onToggleTheme }: LoginProps) {
  const { login, isLoggingIn, loginStatus, identity } = useInternetIdentity();
  const saveProfile = useSaveCallerProfile();
  const [showSetup, setShowSetup] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<AppRole>(AppRole.Salesman);

  const handleLogin = async () => {
    await login();
    setShowSetup(true);
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    try {
      await saveProfile.mutateAsync({ name: name.trim(), appRole: role });
      toast.success("Profile saved! Welcome to Pottikadai.");
      // Reload to apply auth
      window.location.reload();
    } catch {
      toast.error("Failed to save profile");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "",
          }}
        />
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      {/* Theme toggle */}
      <button
        type="button"
        className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors"
        onClick={onToggleTheme}
        data-ocid="login.toggle"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="border-border shadow-elevated">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display font-bold text-3xl text-foreground">
              Pottikadai
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Business Management Suite
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            {!showSetup ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="bg-muted/50 rounded-lg p-4 text-center border border-border">
                  <p className="text-sm text-muted-foreground">
                    Sign in with Internet Identity to access your business
                    dashboard
                  </p>
                </div>
                <Button
                  className="w-full h-11 font-semibold"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  data-ocid="login.submit_button"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Connecting...
                    </>
                  ) : (
                    "Sign In with Internet Identity"
                  )}
                </Button>
                {loginStatus === "loginError" && (
                  <p
                    className="text-xs text-destructive text-center"
                    data-ocid="login.error_state"
                  >
                    Login failed. Please try again.
                  </p>
                )}
                <p className="text-xs text-center text-muted-foreground">
                  Secure, decentralized authentication powered by the Internet
                  Computer
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <h2 className="font-display font-semibold text-xl">
                    Complete Your Profile
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set up your account to get started
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup-name">Full Name</Label>
                  <Input
                    id="setup-name"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-ocid="setup.name.input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup-role">Role</Label>
                  <Select
                    value={role}
                    onValueChange={(v) => setRole(v as AppRole)}
                  >
                    <SelectTrigger data-ocid="setup.role.select">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AppRole.Admin}>Admin</SelectItem>
                      <SelectItem value={AppRole.Manager}>Manager</SelectItem>
                      <SelectItem value={AppRole.Salesman}>Salesman</SelectItem>
                      <SelectItem value={AppRole.Auditor}>Auditor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full h-11 font-semibold"
                  onClick={handleSaveProfile}
                  disabled={saveProfile.isPending}
                  data-ocid="setup.submit_button"
                >
                  {saveProfile.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Saving...
                    </>
                  ) : (
                    "Complete Setup"
                  )}
                </Button>
                {!identity && (
                  <p className="text-xs text-center text-muted-foreground">
                    Connected as anonymous • Login first to save profile
                  </p>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </div>
      </motion.div>
    </div>
  );
}
