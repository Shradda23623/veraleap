import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AmenitiesSelector from "@/components/AmenitiesSelector";
import { useSEO } from "@/hooks/useSEO";

const propertySchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(["apartment", "house", "villa", "studio", "pg", "commercial"]),
  city: z.string().trim().min(2, "City is required").max(100),
  location: z.string().trim().min(2, "Location is required").max(300),
  price: z.coerce.number().int().positive("Price must be positive"),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().int().min(0).max(20),
  area: z.coerce.number().int().min(0, "Area must be positive"),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "villa", label: "Villa" },
  { value: "studio", label: "Studio" },
  { value: "pg", label: "PG / Hostel" },
  { value: "commercial", label: "Commercial" },
];

const MAX_IMAGES = 8;

const AddProperty = () => {
  useSEO({ title: "Add a property", description: "List a new rental property on VeraLeap." });
  const { user, isLoggedIn, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: "",
      description: "",
      type: "apartment",
      city: "",
      location: "",
      price: 0,
      bedrooms: 1,
      bathrooms: 1,
      area: 0,
    },
  });

  if (loading) return (
    <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
      <div className="inline-flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading...
      </div>
    </div>
  );
  if (!isLoggedIn || !user) return <Navigate to="/login" />;
  if (user.role !== "owner" && user.role !== "broker" && user.role !== "admin") {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">Only owners and brokers can add properties.</p>
      </div>
    );
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const available = MAX_IMAGES - imageFiles.length;
    const accepted: File[] = [];
    for (const file of files.slice(0, available)) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds the 5MB limit`, variant: "destructive" });
        continue;
      }
      accepted.push(file);
    }
    if (files.length > available) {
      toast({ title: "Too many images", description: `You can upload up to ${MAX_IMAGES} images.` });
    }
    if (accepted.length) {
      setImageFiles(prev => [...prev, ...accepted]);
      setImagePreviews(prev => [...prev, ...accepted.map(f => URL.createObjectURL(f))]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      const url = prev[index];
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const onSubmit = async (values: PropertyFormValues) => {
    setSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("property-images")
          .getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }

      const insertData: Record<string, unknown> = {
        title: values.title,
        description: values.description || null,
        type: values.type,
        city: values.city,
        location: values.location,
        price: values.price,
        bedrooms: values.bedrooms,
        bathrooms: values.bathrooms,
        area: values.area,
        owner_id: user.id,
        image_url: uploadedUrls[0] ?? null,
        amenities,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      };

      if (user.role === "broker") {
        insertData.broker_id = user.id;
      }

      const { data: inserted, error } = await supabase.from("properties").insert(insertData as any).select("id").single();
      if (error) throw error;

      if (inserted?.id && uploadedUrls.length) {
        const rows = uploadedUrls.map((url, i) => ({
          property_id: inserted.id,
          url,
          sort_order: i,
        }));
        const { error: imgError } = await supabase.from("property_images").insert(rows);
        if (imgError) {
          toast({
            title: "Images partially saved",
            description: "The listing was created, but some gallery images didn't save. You can add them again from Edit Property.",
            variant: "destructive",
          });
        }
      }

      toast({ title: "Property added!", description: "Your listing has been created successfully." });
      queryClient.invalidateQueries({ queryKey: ["owner-properties"] });
      queryClient.invalidateQueries({ queryKey: ["broker-listings"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to add property", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-3xl font-display font-bold mb-1">
        Add New <span className="text-gradient-hero">Property</span>
      </h1>
      <p className="text-muted-foreground text-sm mb-8">Fill in the details to create a new listing.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Image Upload */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-sm font-medium">Property Images</label>
              <span className="text-xs text-muted-foreground">{imageFiles.length}/{MAX_IMAGES} — first image is the cover</span>
            </div>
            {imagePreviews.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {imagePreviews.map((src, i) => (
                  <div key={src} className="relative rounded-xl overflow-hidden aspect-video bg-muted">
                    <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full">Cover</span>
                    )}
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-2 right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {imageFiles.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Upload className="w-6 h-6" />
                    <span className="text-xs font-medium">Add more</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm font-medium">Click to upload images</span>
                <span className="text-xs">JPG, PNG up to 5MB each — up to {MAX_IMAGES} images</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
          </div>

          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem>
              <FormLabel>Property Title</FormLabel>
              <FormControl><Input placeholder="e.g. 2BHK Apartment in Andheri West" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl><Textarea placeholder="Describe the property, amenities, nearby landmarks..." rows={4} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Property Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem>
                <FormLabel>Rent (₹/month)</FormLabel>
                <FormControl><Input type="number" min={0} placeholder="15000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="city" render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl><Input placeholder="Mumbai" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel>Location / Area</FormLabel>
                <FormControl><Input placeholder="Andheri West" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField control={form.control} name="bedrooms" render={({ field }) => (
              <FormItem>
                <FormLabel>Bedrooms</FormLabel>
                <FormControl><Input type="number" min={0} max={20} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="bathrooms" render={({ field }) => (
              <FormItem>
                <FormLabel>Bathrooms</FormLabel>
                <FormControl><Input type="number" min={0} max={20} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="area" render={({ field }) => (
              <FormItem>
                <FormLabel>Area (sq ft)</FormLabel>
                <FormControl><Input type="number" min={0} placeholder="850" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Amenities</label>
            <p className="text-xs text-muted-foreground mb-3">Select everything that applies — helps tenants filter and compare.</p>
            <AmenitiesSelector value={amenities} onChange={setAmenities} />
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-gradient-hero text-primary-foreground border-0 h-11">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Adding...</> : "Add Property"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default AddProperty;
