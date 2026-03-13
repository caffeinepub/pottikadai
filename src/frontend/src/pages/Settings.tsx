import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Save,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppRole } from "../backend.d";
import { useAppSession } from "../hooks/useAppSession";
import {
  useAppUsers,
  useChangePassword,
  useCreateAppUser,
  useDeleteAppUser,
} from "../hooks/useQueries";

const ROLE_OPTIONS = [
  { value: AppRole.Admin, label: "Admin", desc: "Full system access" },
  {
    value: AppRole.Manager,
    label: "Manager",
    desc: "All except user management",
  },
  { value: AppRole.Salesman, label: "Salesman", desc: "POS, products, sales" },
  {
    value: AppRole.Auditor,
    label: "Auditor",
    desc: "Read-only reports & accounting",
  },
];

const ROLE_COLORS: Record<AppRole, string> = {
  [AppRole.Admin]: "bg-destructive/20 text-destructive border-destructive/30",
  [AppRole.Manager]: "bg-primary/20 text-primary border-primary/30",
  [AppRole.Salesman]: "bg-accent/20 text-accent-foreground border-accent/30",
  [AppRole.Auditor]: "bg-muted text-muted-foreground border-border",
};

export function Settings() {
  const { session } = useAppSession();
  const isAdmin = session?.appRole === AppRole.Admin;

  // Business state
  const [bizName, setBizName] = useState("My Business");
  const [bizAddress, setBizAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [savingBiz, setSavingBiz] = useState(false);

  // Change password state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const changePassword = useChangePassword();

  // User management state
  const { data: appUsers = [], isLoading: usersLoading } = useAppUsers();
  const createUser = useCreateAppUser();
  const deleteUser = useDeleteAppUser();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AppRole>(AppRole.Salesman);

  const handleSaveBusiness = async () => {
    setSavingBiz(true);
    await new Promise((r) => setTimeout(r, 500));
    setSavingBiz(false);
    toast.success("Business profile saved");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!currentPw) {
      toast.error("Current password is required");
      return;
    }
    if (!newPw) {
      toast.error("New password is required");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      const ok = await changePassword.mutateAsync({
        username: session.username,
        oldPassword: currentPw,
        newPassword: newPw,
      });
      if (!ok) throw new Error("Current password is incorrect");
      toast.success("Password updated successfully");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update password",
      );
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newPassword) {
      toast.error("All fields are required");
      return;
    }
    try {
      const ok = await createUser.mutateAsync({
        username: newUsername.trim(),
        password: newPassword,
        name: newName.trim(),
        appRole: newRole,
      });
      if (!ok) throw new Error("Username already exists");
      toast.success(`User "${newUsername}" created`);
      setAddOpen(false);
      setNewName("");
      setNewUsername("");
      setNewPassword("");
      setNewRole(AppRole.Salesman);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (username === session?.username) {
      toast.error("You cannot delete your own account");
      return;
    }
    try {
      await deleteUser.mutateAsync(username);
      toast.success(`User "${username}" deleted`);
    } catch {
      toast.error("Failed to delete user");
    }
  };

  return (
    <div className="p-4 md:p-6" data-ocid="settings.page">
      <Tabs defaultValue="business">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="business" data-ocid="settings.business.tab">
            <Building2 className="w-4 h-4 mr-2" /> Business
          </TabsTrigger>
          <TabsTrigger value="security" data-ocid="settings.security.tab">
            <KeyRound className="w-4 h-4 mr-2" /> Security
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users" data-ocid="settings.users.tab">
              <Users className="w-4 h-4 mr-2" /> Users
            </TabsTrigger>
          )}
          <TabsTrigger value="roles" data-ocid="settings.roles.tab">
            <Shield className="w-4 h-4 mr-2" /> Roles
          </TabsTrigger>
        </TabsList>

        {/* Business Profile */}
        <TabsContent value="business">
          <div className="max-w-2xl space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-display">
                  Business Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Business Name</Label>
                  <Input
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    placeholder="Your Business Name"
                    data-ocid="settings.bizname.input"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Address</Label>
                  <Textarea
                    value={bizAddress}
                    onChange={(e) => setBizAddress(e.target.value)}
                    placeholder="Street, City, State, PIN"
                    rows={3}
                    data-ocid="settings.bizaddress.textarea"
                  />
                </div>
                <div className="space-y-1">
                  <Label>GSTIN</Label>
                  <Input
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                    className="font-mono uppercase"
                    maxLength={15}
                    data-ocid="settings.gstin.input"
                  />
                </div>
                <Button
                  onClick={handleSaveBusiness}
                  disabled={savingBiz}
                  data-ocid="settings.biz.save_button"
                >
                  {savingBiz ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Business Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security / Change Password */}
        <TabsContent value="security">
          <div className="max-w-2xl space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-display">
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="current-pw">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-pw"
                        type={showCurrentPw ? "text" : "password"}
                        placeholder="Enter current password"
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        data-ocid="settings.current_pw.input"
                        className="pr-10"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowCurrentPw((v) => !v)}
                      >
                        {showCurrentPw ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="new-pw">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-pw"
                        type={showNewPw ? "text" : "password"}
                        placeholder="Enter new password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        data-ocid="settings.new_pw.input"
                        className="pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowNewPw((v) => !v)}
                      >
                        {showNewPw ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="confirm-pw">Confirm New Password</Label>
                    <Input
                      id="confirm-pw"
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      data-ocid="settings.confirm_pw.input"
                      autoComplete="new-password"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={changePassword.isPending}
                    data-ocid="settings.changepw.submit_button"
                  >
                    {changePassword.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <KeyRound className="w-4 h-4 mr-2" />
                    )}
                    Update Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Management (Admin only) */}
        {isAdmin && (
          <TabsContent value="users">
            <div className="max-w-2xl space-y-4">
              <Card className="border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-display">
                    User Management
                  </CardTitle>
                  <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        data-ocid="settings.user.open_modal_button"
                      >
                        <UserPlus className="w-4 h-4 mr-2" /> Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent data-ocid="settings.user.dialog">
                      <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddUser} className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <Label>Full Name</Label>
                          <Input
                            placeholder="John Doe"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            data-ocid="settings.newuser.name.input"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Username</Label>
                          <Input
                            placeholder="johndoe"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            data-ocid="settings.newuser.username.input"
                            autoComplete="off"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Password</Label>
                          <Input
                            type="password"
                            placeholder="Set initial password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            data-ocid="settings.newuser.password.input"
                            autoComplete="new-password"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Role</Label>
                          <Select
                            value={newRole}
                            onValueChange={(v) => setNewRole(v as AppRole)}
                          >
                            <SelectTrigger data-ocid="settings.newuser.role.select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAddOpen(false)}
                            data-ocid="settings.user.cancel_button"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createUser.isPending}
                            data-ocid="settings.user.confirm_button"
                          >
                            {createUser.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Create User
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div
                      className="flex items-center justify-center py-8"
                      data-ocid="settings.users.loading_state"
                    >
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : appUsers.length === 0 ? (
                    <div
                      className="text-center py-8 text-sm text-muted-foreground"
                      data-ocid="settings.users.empty_state"
                    >
                      No users found.
                    </div>
                  ) : (
                    <div className="space-y-2" data-ocid="settings.users.list">
                      {appUsers.map((user, idx) => (
                        <div
                          key={user.username}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                          data-ocid={`settings.users.item.${idx + 1}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {user.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                @{user.username}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={ROLE_COLORS[user.appRole]}
                            >
                              {user.appRole}
                            </Badge>
                            {user.username !== session?.username && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteUser(user.username)}
                                disabled={deleteUser.isPending}
                                data-ocid={`settings.users.delete_button.${idx + 1}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Roles Reference */}
        <TabsContent value="roles">
          <div className="max-w-2xl">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-display">
                  Role Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ROLE_OPTIONS.map((r, idx) => (
                    <div
                      key={r.value}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                      data-ocid={`settings.role.card.${idx + 1}`}
                    >
                      <Badge variant="outline" className={ROLE_COLORS[r.value]}>
                        {r.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {r.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
