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
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Moon,
  Store,
  Sun,
  UserPlus,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppRole } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useAppSession } from "../hooks/useAppSession";
import { useCreateAppUser, useLogin } from "../hooks/useQueries";

const DEFAULT_ADMIN_EMAIL = "mail2rakeshkavi@gmail.com";

interface LoginProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Login({ isDark, onToggleTheme }: LoginProps) {
  const { login } = useAppSession();
  const { actor, isFetching: actorFetching } = useActor();
  const loginMutation = useLogin();
  const createUser = useCreateAppUser();

  const [username, setUsername] = useState(DEFAULT_ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // First-run state
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [setupName, setSetupName] = useState("Administrator");
  const [setupUsername, setSetupUsername] = useState(DEFAULT_ADMIN_EMAIL);
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [setupRole, setSetupRole] = useState<AppRole>(AppRole.Admin);
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    if (!actor || actorFetching) return;
    const a = actor as any;
    a.isFirstRun()
      .then((v: boolean) => setIsFirstRun(v))
      .catch(() => setIsFirstRun(false));
  }, [actor, actorFetching]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const result = await loginMutation.mutateAsync({ username, password });
      if (!result) throw new Error("Invalid username or password");
      login({ username, name: result.name, appRole: result.appRole });
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setLoginError(msg);
    }
  };

  const handleFirstRunSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    if (!setupName.trim()) {
      setSetupError("Name is required");
      return;
    }
    if (!setupUsername.trim()) {
      setSetupError("Username is required");
      return;
    }
    if (setupPassword.length < 1) {
      setSetupError("Password is required");
      return;
    }
    if (setupPassword !== setupConfirm) {
      setSetupError("Passwords do not match");
      return;
    }
    try {
      const ok = await createUser.mutateAsync({
        username: setupUsername.trim(),
        password: setupPassword,
        name: setupName.trim(),
        appRole: setupRole,
      });
      if (!ok) throw new Error("Failed to create admin user");
      toast.success("Admin account created! Please sign in.");
      setIsFirstRun(false);
      setUsername(setupUsername.trim());
      setPassword("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Setup failed";
      setSetupError(msg);
      toast.error(msg);
    }
  };

  const isLoading = isFirstRun === null || actorFetching;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute top-3/4 left-1/3 w-64 h-64 rounded-full bg-primary/5 blur-2xl" />
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
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-8 gap-3"
                  data-ocid="login.loading_state"
                >
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Connecting...</p>
                </motion.div>
              ) : isFirstRun ? (
                <motion.div
                  key="firstrun"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-3">
                      <UserPlus className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-medium text-primary">
                        First Time Setup
                      </span>
                    </div>
                    <h2 className="font-display font-semibold text-xl">
                      Create Admin Account
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Set up your administrator credentials to get started
                    </p>
                  </div>

                  <form onSubmit={handleFirstRunSetup} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="setup-name">Full Name</Label>
                      <Input
                        id="setup-name"
                        placeholder="Administrator"
                        value={setupName}
                        onChange={(e) => setSetupName(e.target.value)}
                        data-ocid="setup.name.input"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="setup-username">Username / Email</Label>
                      <Input
                        id="setup-username"
                        placeholder="mail2rakeshkavi@gmail.com"
                        value={setupUsername}
                        onChange={(e) => setSetupUsername(e.target.value)}
                        data-ocid="setup.input"
                        autoComplete="username"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="setup-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="setup-password"
                          type={showSetupPassword ? "text" : "password"}
                          placeholder="Enter password"
                          value={setupPassword}
                          onChange={(e) => setSetupPassword(e.target.value)}
                          data-ocid="setup.textarea"
                          autoComplete="new-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowSetupPassword((v) => !v)}
                        >
                          {showSetupPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="setup-confirm">Confirm Password</Label>
                      <Input
                        id="setup-confirm"
                        type="password"
                        placeholder="Confirm password"
                        value={setupConfirm}
                        onChange={(e) => setSetupConfirm(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="setup-role">Role</Label>
                      <Select
                        value={setupRole}
                        onValueChange={(v) => setSetupRole(v as AppRole)}
                      >
                        <SelectTrigger data-ocid="setup.select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={AppRole.Admin}>Admin</SelectItem>
                          <SelectItem value={AppRole.Manager}>
                            Manager
                          </SelectItem>
                          <SelectItem value={AppRole.Salesman}>
                            Salesman
                          </SelectItem>
                          <SelectItem value={AppRole.Auditor}>
                            Auditor
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {setupError && (
                      <div
                        className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-md p-3"
                        data-ocid="setup.error_state"
                      >
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{setupError}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 font-semibold"
                      disabled={createUser.isPending}
                      data-ocid="setup.submit_button"
                    >
                      {createUser.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        "Create Admin Account"
                      )}
                    </Button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="login"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="username">Username / Email</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter username or email"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setLoginError(null);
                        }}
                        data-ocid="login.input"
                        autoComplete="username"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setLoginError(null);
                          }}
                          data-ocid="login.textarea"
                          autoComplete="current-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {loginError && (
                      <div
                        className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-md p-3"
                        data-ocid="login.error_state"
                      >
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 font-semibold"
                      disabled={loginMutation.isPending}
                      data-ocid="login.submit_button"
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
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
