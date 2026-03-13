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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle2,
  FileText,
  GripVertical,
  Loader2,
  Plus,
  Printer,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Variant_a4_a5_thermal } from "../backend.d";
import type { InvoiceTemplate } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInvoiceTemplates } from "../hooks/useQueries";

const PRINT_SIZES = [
  {
    value: Variant_a4_a5_thermal.a4,
    label: "A4 (210 × 297 mm)",
    width: 210,
    height: 297,
  },
  {
    value: Variant_a4_a5_thermal.a5,
    label: "A5 (148 × 210 mm)",
    width: 148,
    height: 210,
  },
  {
    value: Variant_a4_a5_thermal.thermal,
    label: "Thermal (80 mm)",
    width: 80,
    height: 200,
  },
];

const DEFAULT_FIELDS = [
  { id: "business_name", label: "Business Name", enabled: true },
  { id: "logo", label: "Logo", enabled: true },
  { id: "invoice_number", label: "Invoice Number", enabled: true },
  { id: "date", label: "Date", enabled: true },
  { id: "party_name", label: "Customer Name", enabled: true },
  { id: "party_address", label: "Customer Address", enabled: true },
  { id: "items_table", label: "Items Table", enabled: true },
  { id: "subtotal", label: "Subtotal", enabled: true },
  { id: "tax", label: "Tax Amount", enabled: true },
  { id: "total", label: "Total Amount", enabled: true },
  { id: "payment_mode", label: "Payment Mode", enabled: true },
  { id: "footer", label: "Footer / Notes", enabled: false },
  { id: "gstin", label: "GSTIN", enabled: false },
  { id: "barcode", label: "Barcode", enabled: false },
];

export function InvoiceDesigner() {
  const { data: templates, refetch } = useInvoiceTemplates();
  const { actor } = useActor();

  const [selectedTemplate, setSelectedTemplate] =
    useState<InvoiceTemplate | null>(null);
  const [name, setName] = useState("New Template");
  const [printSize, setPrintSize] = useState<Variant_a4_a5_thermal>(
    Variant_a4_a5_thermal.a4,
  );
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [saving, setSaving] = useState(false);

  const sizeInfo =
    PRINT_SIZES.find((s) => s.value === printSize) || PRINT_SIZES[0];
  const isNarrow = printSize === Variant_a4_a5_thermal.thermal;

  const toggleField = (id: string) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    );
  };

  const loadTemplate = (t: InvoiceTemplate) => {
    setSelectedTemplate(t);
    setName(t.name);
    setPrintSize(t.printSize as Variant_a4_a5_thermal);
    try {
      const config = JSON.parse(t.layoutConfig || "{}");
      if (config.fields) {
        setFields(config.fields);
      }
    } catch {
      /* ignore */
    }
  };

  const handleSave = async () => {
    if (!actor) {
      toast.error("Not connected");
      return;
    }
    setSaving(true);
    try {
      const template: InvoiceTemplate = {
        id: selectedTemplate?.id || crypto.randomUUID(),
        name,
        printSize: {
          [printSize as string]: null,
        } as unknown as InvoiceTemplate["printSize"],
        isDefault: false,
        layoutConfig: JSON.stringify({ fields, printSize }),
      };
      if (selectedTemplate) {
        await actor.updateInvoiceTemplate(template);
      } else {
        await actor.createInvoiceTemplate(template);
      }
      await refetch();
      toast.success("Template saved");
      setSelectedTemplate(template);
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!actor) return;
    try {
      await actor.setDefaultTemplate(id);
      await refetch();
      toast.success("Default template updated");
    } catch {
      toast.error("Failed to update default");
    }
  };

  return (
    <div className="p-4 md:p-6" data-ocid="designer.page">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">Templates</h2>
            <Button
              size="sm"
              onClick={() => {
                setSelectedTemplate(null);
                setName("New Template");
                setFields(DEFAULT_FIELDS);
                setPrintSize(Variant_a4_a5_thermal.a4);
              }}
              data-ocid="designer.new.button"
            >
              <Plus className="w-3 h-3 mr-1" /> New
            </Button>
          </div>
          {(templates ?? []).length === 0 ? (
            <div
              className="text-center py-8 text-muted-foreground text-sm"
              data-ocid="designer.templates.empty_state"
            >
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
              No templates yet
            </div>
          ) : (
            (templates ?? []).map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <button
                  type="button"
                  onClick={() => loadTemplate(t)}
                  className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedTemplate?.id === t.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40 bg-card"
                  }`}
                  data-ocid={`designer.template.card.${i + 1}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{t.name}</div>
                    {t.isDefault && (
                      <Badge variant="default" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <Printer className="w-3 h-3" />
                    {PRINT_SIZES.find((s) => {
                      const sizeKey = Object.keys(t.printSize)[0];
                      return s.value === sizeKey;
                    })?.label || String(Object.keys(t.printSize)[0])}
                  </div>
                  {!t.isDefault && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 h-6 text-xs px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetDefault(t.id);
                      }}
                      data-ocid={`designer.set_default.button.${i + 1}`}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Set as Default
                    </Button>
                  )}
                </button>
              </motion.div>
            ))
          )}
        </div>

        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">
                Template Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Template Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-ocid="designer.name.input"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Print Size</Label>
                  <Select
                    value={printSize}
                    onValueChange={(v) =>
                      setPrintSize(v as Variant_a4_a5_thermal)
                    }
                  >
                    <SelectTrigger data-ocid="designer.size.select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRINT_SIZES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview + Fields side by side */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Field toggles */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display">Fields</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-3 h-3 text-muted-foreground/50" />
                      <span className="text-sm">{field.label}</span>
                    </div>
                    <Switch
                      checked={field.enabled}
                      onCheckedChange={() => toggleField(field.id)}
                      data-ocid={`designer.field.${field.id}.switch`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Live Preview */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Preview ({sizeInfo.label})
              </div>
              <div
                className="bg-white text-black rounded-lg border border-border overflow-hidden mx-auto"
                style={{
                  width: isNarrow ? "200px" : "100%",
                  minHeight: isNarrow ? "280px" : "320px",
                  padding: isNarrow ? "12px" : "20px",
                  fontSize: isNarrow ? "9px" : "11px",
                  fontFamily: "monospace",
                }}
              >
                {fields
                  .filter((f) => f.enabled)
                  .map((field) => (
                    <div key={field.id} className="mb-1.5">
                      {field.id === "business_name" && (
                        <div
                          className="font-bold text-center"
                          style={{ fontSize: isNarrow ? "12px" : "16px" }}
                        >
                          Your Business Name
                        </div>
                      )}
                      {field.id === "logo" && (
                        <div
                          className="text-center text-gray-400 border border-dashed border-gray-300 rounded p-2 mb-2"
                          style={{ fontSize: "10px" }}
                        >
                          [ LOGO ]
                        </div>
                      )}
                      {field.id === "invoice_number" && (
                        <div>Invoice #: INV-00001</div>
                      )}
                      {field.id === "date" && (
                        <div>Date: {new Date().toLocaleDateString()}</div>
                      )}
                      {field.id === "party_name" && (
                        <div>Customer: John Doe</div>
                      )}
                      {field.id === "party_address" && (
                        <div>Address: 123 Street, City</div>
                      )}
                      {field.id === "gstin" && (
                        <div>GSTIN: 22AAAAA0000A1Z5</div>
                      )}
                      {field.id === "items_table" && (
                        <div className="my-2 border-t border-b border-black py-1">
                          <div className="flex justify-between font-bold">
                            <span>Item</span>
                            <span>Amt</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Product A × 2</span>
                            <span>200</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Product B × 1</span>
                            <span>150</span>
                          </div>
                        </div>
                      )}
                      {field.id === "subtotal" && (
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>350</span>
                        </div>
                      )}
                      {field.id === "tax" && (
                        <div className="flex justify-between">
                          <span>Tax (18%):</span>
                          <span>63</span>
                        </div>
                      )}
                      {field.id === "total" && (
                        <div
                          className="flex justify-between font-bold border-t border-black pt-1"
                          style={{ fontSize: isNarrow ? "11px" : "14px" }}
                        >
                          <span>Total:</span>
                          <span>₹413</span>
                        </div>
                      )}
                      {field.id === "payment_mode" && <div>Payment: Cash</div>}
                      {field.id === "footer" && (
                        <div className="text-center text-gray-500 border-t border-gray-300 pt-1 mt-1">
                          Thank you for your business!
                        </div>
                      )}
                      {field.id === "barcode" && (
                        <div
                          className="text-center border border-dashed border-gray-300 rounded p-1 mt-1"
                          style={{ fontSize: "9px" }}
                        >
                          ||||| BARCODE |||||
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
              data-ocid="designer.save.primary_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {saving
                ? "Saving..."
                : selectedTemplate
                  ? "Update Template"
                  : "Save Template"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
