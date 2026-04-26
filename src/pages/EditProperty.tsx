import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Upload, X, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import AmenitiesSelector from "@/components/AmenitiesSelector";
import { useSEO } from "@/hooks/useSEO";

const propertySchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(["apartment", "house", "villa", "studio", "pg", "commercial"]),
  city: z.string().trim().min(2).max(100),
  location: z.string().trim().min(2).max(300),
  price: z.coerce.number().int().positive(),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().int().min(0).max(20),
  area: z.coerce.number().int().min(0),
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

interface PropertyImage { id: string; url: string; isNew?: boolean; file?: File }
const MAX_IMAGES = 8;

const EditProperty = () => {
  useSEO({ title: "Edit property", description: "Update the details of your rental listing on VeraLeap." });
  const { id } = useParams();
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: galleryImages } = useQuery({
    queryKey: ["property-images", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("property_images")
        .select("id, url, sort_order")
        .eq("property_id", id!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: { title: "", description: "", type: "apartment", city: "", location: "", price: 0, bedrooms: 1, bathrooms: 1, area: 0 },
  });

  useEffect(() => {
    if (property) {
      form.reset({
        title: property.title,
        description: property.description || "",
        type: property.type as PropertyFormValues["type"],
        city: property.city,
        location: property.location,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area: property.area,
      });
      setAmenities(Array.isArray(property.amenities) ? property.amenities : []);
      if (typeof property.latitude === "number" && typeof property.longitude === "number") {
        setCoords({ lat: property.latitude, lng: property.longitude });
      }
    }
  }, [property, form]);

  useEffect(() => {
    if (galleryImages && galleryImages.length) {
      setImages(galleryImages.map(g => ({ id: g.id, url: g.url })));
    } else if (property?.image_url && images.length === 0 && !galleryImages) {
      // fall back to the legacy single image while the gallery query is loading
      setImages([{ id: `legacy-${property.id}`, url: property.image_url }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryImages, property?.image_url]);

  if (authLoading || isLoading) return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-4">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
  if (!isLoggedIn || !user) return <Navigate to="/login" />;
  if (property && property.owner_id !== user.id && user.role !== "admin") {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You can only edit your own properties.</p>
      </div>
    );
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const available = MAX_IMAGES - images.length;
    const accepted: PropertyImage[] = [];
    for (const file of files.slice(0, available)) {
      if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", description: `${file.name} exceeds 5MB`, variant: "destructive" }); continue; }
      accepted.push({ id: `new-${Date.now()}-${Math.random()}`, url: URL.createObjectURL(file), file, isNew: true });
    }
    if (files.length > available) {
      toast({ title: "Too many images", description: `You can have up to ${MAX_IMAGES} images total.` });
    }
    if (accepted.length) setImages(prev => [...prev, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (img: PropertyImage) => {
    if (img.url.startsWith("blob:")) URL.revokeObjectURL(img.url);
    if (!img.isNew && !img.id.startsWith("legacy-")) setRemovedIds(prev => [...prev, img.id]);
    setImages(prev => prev.filter(i => i.id !== img.id));
  };

  const onSubmit = async (values: PropertyFormValues) => {
    setSubmitting(true);
    try {
      // Upload any new files first
      const uploaded: { url: string; sort_order: number }[] = [];
      const finalOrderedUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.isNew && img.file) {
          const ext = img.file.name.split(".").pop() || "jpg";
          const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("property-images").upload(path, img.file);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(path);
          uploaded.push({ url: urlData.publicUrl, sort_order: i });
          finalOrderedUrls.push(urlData.publicUrl);
        } else {
          finalOrderedUrls.push(img.url);
        }
      }

      // Delete removed images
      if (removedIds.length) {
        const { error: delError } = await supabase.from("property_images").delete().in("id", removedIds);
        if (delError) console.warn("Failed to delete some images", delError);
      }

      // Insert newly uploaded images
      if (uploaded.length) {
        const rows = uploaded.map(u => ({ property_id: id!, url: u.url, sort_order: u.sort_order }));
        const { error: imgError } = await supabase.from("property_images").insert(rows);
        if (imgError) console.warn("Failed to save new gallery images", imgError);
      }

      // Re-sort existing images by current order
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (!img.isNew && !img.id.startsWith("legacy-")) {
          await supabase.from("property_images").update({ sort_order: i }).eq("id", img.id);
        }
      }

      const { error } = await supabase.from("properties").update({
        ...values,
        description: values.description || null,
        image_url: finalOrderedUrls[0] ?? null,
        amenities,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      }).eq("id", id!);

      if (error) throw error;
      toast({ title: "Property updated!" });
      queryClient.invalidateQueries({ queryKey: ["property", id] });
      queryClient.invalidateQueries({ queryKey: ["property-images", id] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["owner-properties"] });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("properties").delete().eq("id", id!);
      if (error) throw error;
      toast({ title: "Property deleted" });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["owner-properties"] });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Edit <span className="text-gradient-hero">Property</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Update your property listing details.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm"><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this property?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone. The property listing will be permanently removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-sm font-medium">Property Images</label>
              <span className="text-xs text-muted-foreground">{images.length}/{MAX_IMAGES} — first image is the cover</span>
            </div>
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img, i) => (
                  <div key={img.id} className="relative rounded-xl overflow-hidden aspect-video bg-muted">
                    <img src={img.url} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full">Cover</span>
                    )}
                    <button type="button" onClick={() => removeImage(img)} className="absolute top-2 right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="aspect-video border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    <Upload className="w-6 h-6" /><span className="text-xs font-medium">Add more</span>
                  </button>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Upload className="w-8 h-8" /><span className="text-sm font-medium">Click to upload images</span>
                <span className="text-xs">Up to {MAX_IMAGES} images, 5MB each</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
          </div>

          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem><FormLabel>Property Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem><FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem><FormLabel>Rent (₹/month)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="city" render={({ field }) => (
              <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField control={form.control} name="bedrooms" render={({ field }) => (
              <FormItem><FormLabel>Bedrooms</FormLabel><FormControl><Input type="number" min={0} max={20} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="bathrooms" render={({ field }) => (
              <FormItem><FormLabel>Bathrooms</FormLabel><FormControl><Input type="number" min={0} max={20} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="area" render={({ field }) => (
              <FormItem><FormLabel>Area (sqft)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Amenities</label>
            <AmenitiesSelector value={amenities} onChange={setAmenities} />
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-gradient-hero text-primary-foreground border-0 h-11">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : "Save Changes"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default EditProperty;
