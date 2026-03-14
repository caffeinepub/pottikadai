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
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  Save,
  Shield,
  Smartphone,
  Star,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { BusinessProfile } from "../backend.d";
import { AppRole } from "../backend.d";
import { useAppSession } from "../hooks/useAppSession";
import {
  useAppUsers,
  useBusinessProfile,
  useChangePassword,
  useCreateAppUser,
  useDeleteAppUser,
  useSaveBusinessProfile,
} from "../hooks/useQueries";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

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

const emptyProfile = (): BusinessProfile => ({
  businessName: "",
  gstNumber: "",
  address: "",
  phone: "",
  email: "",
  logoUrl: "",
  bankAccounts: [],
  upiIds: [],
});

function BusinessProfileTab() {
  const { data: profileData, isLoading } = useBusinessProfile();
  const saveProfile = useSaveBusinessProfile();

  const [profile, setProfile] = useState<BusinessProfile>(emptyProfile());
  const [gstValid, setGstValid] = useState<boolean | null>(null);

  // Bank account add dialog
  const [bankOpen, setBankOpen] = useState(false);
  const [newBank, setNewBank] = useState({
    bankName: "",
    accountNumber: "",
    ifsc: "",
    accountHolder: "",
  });

  // UPI add dialog
  const [upiOpen, setUpiOpen] = useState(false);
  const [newUpi, setNewUpi] = useState({ upiLabel: "", upiId: "" });

  useEffect(() => {
    if (profileData) setProfile(profileData);
  }, [profileData]);

  const handleGstChange = (val: string) => {
    const upper = val.toUpperCase().slice(0, 15);
    setProfile((p) => ({ ...p, gstNumber: upper }));
    if (upper.length === 0) {
      setGstValid(null);
    } else if (upper.length === 15) {
      setGstValid(GSTIN_REGEX.test(upper));
    } else {
      setGstValid(false);
    }
  };

  const handleSaveProfile = async () => {
    if (profile.gstNumber && !GSTIN_REGEX.test(profile.gstNumber)) {
      toast.error("Invalid GST number format");
      return;
    }
    try {
      await saveProfile.mutateAsync(profile);
      toast.success("Business profile saved");
    } catch {
      toast.error("Failed to save profile");
    }
  };

  const addBank = () => {
    if (
      !newBank.bankName ||
      !newBank.accountNumber ||
      !newBank.ifsc ||
      !newBank.accountHolder
    ) {
      toast.error("All bank fields are required");
      return;
    }
    setProfile((p) => ({
      ...p,
      bankAccounts: [
        ...p.bankAccounts,
        { ...newBank, id: crypto.randomUUID() },
      ],
    }));
    setNewBank({
      bankName: "",
      accountNumber: "",
      ifsc: "",
      accountHolder: "",
    });
    setBankOpen(false);
  };

  const removeBank = (id: string) =>
    setProfile((p) => ({
      ...p,
      bankAccounts: p.bankAccounts.filter((b) => b.id !== id),
    }));

  const addUpi = () => {
    if (!newUpi.upiLabel || !newUpi.upiId) {
      toast.error("Label and UPI ID are required");
      return;
    }
    const isFirst = profile.upiIds.length === 0;
    setProfile((p) => ({
      ...p,
      upiIds: [
        ...p.upiIds,
        { ...newUpi, id: crypto.randomUUID(), isDefault: isFirst },
      ],
    }));
    setNewUpi({ upiLabel: "", upiId: "" });
    setUpiOpen(false);
  };

  const removeUpi = (id: string) =>
    setProfile((p) => {
      const remaining = p.upiIds.filter((u) => u.id !== id);
      // If removed was default, set first as default
      if (remaining.length > 0 && !remaining.some((u) => u.isDefault)) {
        remaining[0] = { ...remaining[0], isDefault: true };
      }
      return { ...p, upiIds: remaining };
    });

  const setDefaultUpi = (id: string) =>
    setProfile((p) => ({
      ...p,
      upiIds: p.upiIds.map((u) => ({ ...u, isDefault: u.id === id })),
    }));

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-16"
        data-ocid="settings.biz.loading_state"
      >
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile" data-ocid="settings.biz.profile.tab">
            <Building2 className="w-4 h-4 mr-2" /> Profile
          </TabsTrigger>
          <TabsTrigger value="payments" data-ocid="settings.biz.payments.tab">
            <CreditCard className="w-4 h-4 mr-2" /> Payment Types
          </TabsTrigger>
        </TabsList>

        {/* Profile sub-tab */}
        <TabsContent value="profile">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-display">
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Business Name</Label>
                <Input
                  value={profile.businessName}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, businessName: e.target.value }))
                  }
                  placeholder="Your Business Name"
                  data-ocid="settings.bizname.input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="+91 98765 43210"
                    data-ocid="settings.phone.input"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    value={profile.email}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="info@business.com"
                    data-ocid="settings.email.input"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Address</Label>
                <Textarea
                  value={profile.address}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, address: e.target.value }))
                  }
                  placeholder="Street, City, State, PIN"
                  rows={3}
                  data-ocid="settings.bizaddress.textarea"
                />
              </div>
              <div className="space-y-1">
                <Label>GST Number (GSTIN)</Label>
                <div className="relative">
                  <Input
                    value={profile.gstNumber}
                    onChange={(e) => handleGstChange(e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                    className="font-mono uppercase pr-10"
                    maxLength={15}
                    data-ocid="settings.gstin.input"
                  />
                  {gstValid === true && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                  {gstValid === false && (
                    <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                  )}
                </div>
                {gstValid === true && (
                  <p
                    className="text-xs text-green-500 mt-1"
                    data-ocid="settings.gstin.success_state"
                  >
                    ✓ Valid GSTIN format
                  </p>
                )}
                {gstValid === false && (
                  <p
                    className="text-xs text-destructive mt-1"
                    data-ocid="settings.gstin.error_state"
                  >
                    Invalid format — must be 15 chars (e.g., 22AAAAA0000A1Z5)
                  </p>
                )}
              </div>
              <Button
                onClick={handleSaveProfile}
                disabled={saveProfile.isPending}
                data-ocid="settings.biz.save_button"
              >
                {saveProfile.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Types sub-tab */}
        <TabsContent value="payments" className="space-y-4">
          {/* Bank Accounts */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Bank Accounts
              </CardTitle>
              <Dialog open={bankOpen} onOpenChange={setBankOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    data-ocid="settings.bank.open_modal_button"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Bank
                  </Button>
                </DialogTrigger>
                <DialogContent data-ocid="settings.bank.dialog">
                  <DialogHeader>
                    <DialogTitle>Add Bank Account</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <Label>Bank Name</Label>
                      <Input
                        value={newBank.bankName}
                        onChange={(e) =>
                          setNewBank((b) => ({
                            ...b,
                            bankName: e.target.value,
                          }))
                        }
                        placeholder="State Bank of India"
                        data-ocid="settings.bank.name.input"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Account Holder Name</Label>
                      <Input
                        value={newBank.accountHolder}
                        onChange={(e) =>
                          setNewBank((b) => ({
                            ...b,
                            accountHolder: e.target.value,
                          }))
                        }
                        placeholder="Full name as per bank"
                        data-ocid="settings.bank.holder.input"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Account Number</Label>
                      <Input
                        value={newBank.accountNumber}
                        onChange={(e) =>
                          setNewBank((b) => ({
                            ...b,
                            accountNumber: e.target.value,
                          }))
                        }
                        placeholder="XXXXXXXXXXXX"
                        data-ocid="settings.bank.number.input"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>IFSC Code</Label>
                      <Input
                        value={newBank.ifsc}
                        onChange={(e) =>
                          setNewBank((b) => ({
                            ...b,
                            ifsc: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="SBIN0001234"
                        className="font-mono uppercase"
                        data-ocid="settings.bank.ifsc.input"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setBankOpen(false)}
                      data-ocid="settings.bank.cancel_button"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={addBank}
                      data-ocid="settings.bank.confirm_button"
                    >
                      Add Account
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {profile.bankAccounts.length === 0 ? (
                <div
                  className="text-center py-6 text-sm text-muted-foreground"
                  data-ocid="settings.bank.empty_state"
                >
                  No bank accounts added yet.
                </div>
              ) : (
                <div className="space-y-2" data-ocid="settings.bank.list">
                  {profile.bankAccounts.map((bank, idx) => (
                    <div
                      key={bank.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                      data-ocid={`settings.bank.item.${idx + 1}`}
                    >
                      <div>
                        <p className="text-sm font-semibold">{bank.bankName}</p>
                        <p className="text-xs text-muted-foreground">
                          {bank.accountHolder}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">
                          {bank.accountNumber} &bull; IFSC: {bank.ifsc}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeBank(bank.id)}
                        data-ocid={`settings.bank.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* UPI IDs */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> UPI IDs
              </CardTitle>
              <Dialog open={upiOpen} onOpenChange={setUpiOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    data-ocid="settings.upi.open_modal_button"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add UPI
                  </Button>
                </DialogTrigger>
                <DialogContent data-ocid="settings.upi.dialog">
                  <DialogHeader>
                    <DialogTitle>Add UPI ID</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <Label>Label</Label>
                      <Input
                        value={newUpi.upiLabel}
                        onChange={(e) =>
                          setNewUpi((u) => ({ ...u, upiLabel: e.target.value }))
                        }
                        placeholder="e.g., Business Account"
                        data-ocid="settings.upi.label.input"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>UPI ID</Label>
                      <Input
                        value={newUpi.upiId}
                        onChange={(e) =>
                          setNewUpi((u) => ({ ...u, upiId: e.target.value }))
                        }
                        placeholder="yourname@upi"
                        data-ocid="settings.upi.id.input"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setUpiOpen(false)}
                      data-ocid="settings.upi.cancel_button"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={addUpi}
                      data-ocid="settings.upi.confirm_button"
                    >
                      Add UPI ID
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {profile.upiIds.length === 0 ? (
                <div
                  className="text-center py-6 text-sm text-muted-foreground"
                  data-ocid="settings.upi.empty_state"
                >
                  No UPI IDs added yet.
                </div>
              ) : (
                <div className="space-y-2" data-ocid="settings.upi.list">
                  {profile.upiIds.map((upi, idx) => (
                    <div
                      key={upi.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                      data-ocid={`settings.upi.item.${idx + 1}`}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">
                              {upi.upiLabel}
                            </p>
                            {upi.isDefault && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-primary/10 text-primary border-primary/30"
                              >
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-mono text-muted-foreground">
                            {upi.upiId}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!upi.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => setDefaultUpi(upi.id)}
                            title="Set as default"
                            data-ocid={`settings.upi.toggle.${idx + 1}`}
                          >
                            <Star className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeUpi(upi.id)}
                          data-ocid={`settings.upi.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {profile.upiIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  <Star className="w-3 h-3 inline mr-1" />
                  Star to set a UPI ID as default for payments.
                </p>
              )}
              {profile.upiIds.length > 0 && (
                <Button
                  className="mt-3"
                  onClick={handleSaveProfile}
                  disabled={saveProfile.isPending}
                  data-ocid="settings.payments.save_button"
                >
                  {saveProfile.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Payment Info
                </Button>
              )}
            </CardContent>
          </Card>

          {(profile.bankAccounts.length > 0 || profile.upiIds.length > 0) && (
            <Button
              onClick={handleSaveProfile}
              disabled={saveProfile.isPending}
              data-ocid="settings.payments.save_button"
            >
              {saveProfile.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save All Payment Info
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function Settings() {
  const { session } = useAppSession();
  const isAdmin = session?.appRole === AppRole.Admin;

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
          <BusinessProfileTab />
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
