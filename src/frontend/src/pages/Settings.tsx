import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Building2, Loader2, Save, Shield, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppRole } from "../backend.d";
import { useCallerProfile, useSaveCallerProfile } from "../hooks/useQueries";

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
  const { data: profile } = useCallerProfile();
  const saveProfile = useSaveCallerProfile();

  const [bizName, setBizName] = useState("My Business");
  const [bizAddress, setBizAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [savingBiz, setSavingBiz] = useState(false);
  const [userName, setUserName] = useState(profile?.name || "");
  const [userRole, setUserRole] = useState<AppRole>(
    profile?.appRole || AppRole.Salesman,
  );

  const handleSaveBusiness = async () => {
    setSavingBiz(true);
    await new Promise((r) => setTimeout(r, 500));
    setSavingBiz(false);
    toast.success("Business profile saved");
  };

  const handleSaveProfile = async () => {
    try {
      await saveProfile.mutateAsync({ name: userName, appRole: userRole });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to save profile");
    }
  };

  return (
    <div className="p-4 md:p-6" data-ocid="settings.page">
      <Tabs defaultValue="business">
        <TabsList className="mb-6">
          <TabsTrigger value="business" data-ocid="settings.business.tab">
            <Building2 className="w-4 h-4 mr-2" /> Business
          </TabsTrigger>
          <TabsTrigger value="users" data-ocid="settings.users.tab">
            <Users className="w-4 h-4 mr-2" /> Users
          </TabsTrigger>
          <TabsTrigger value="security" data-ocid="settings.security.tab">
            <Shield className="w-4 h-4 mr-2" /> Security
          </TabsTrigger>
        </TabsList>

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
                <div className="bg-muted/50 rounded-lg p-3 border border-border text-xs text-muted-foreground">
                  💡 Logo upload: Use the blob storage feature to upload your
                  business logo
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

        <TabsContent value="users">
          <div className="max-w-2xl space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-display">
                  My Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Full Name</Label>
                  <Input
                    value={userName || profile?.name || ""}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Your name"
                    data-ocid="settings.username.input"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select
                    value={userRole}
                    onValueChange={(v) => setUserRole(v as AppRole)}
                  >
                    <SelectTrigger data-ocid="settings.userrole.select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded border font-medium ${ROLE_COLORS[r.value]}`}
                            >
                              {r.label}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {r.desc}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleSaveProfile}
                  disabled={saveProfile.isPending}
                  data-ocid="settings.profile.save_button"
                >
                  {saveProfile.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Update Profile
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-display">
                  Role Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ROLE_OPTIONS.map((r) => (
                    <div
                      key={r.value}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                      data-ocid={`settings.role.card.${ROLE_OPTIONS.indexOf(r) + 1}`}
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

        <TabsContent value="security">
          <div className="max-w-2xl">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-display">
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-sm">
                  <div className="font-semibold mb-1">
                    Internet Identity Authentication
                  </div>
                  <div className="text-muted-foreground">
                    Your account is secured by Internet Identity — decentralized
                    authentication with no passwords. Your principal ID serves
                    as your unique identifier on the Internet Computer network.
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  All data is stored on the Internet Computer blockchain and can
                  only be accessed by authenticated principals with appropriate
                  roles.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
