import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PropertyImageGalleryProps {
  images: string[];
  alt: string;
  className?: string;
}

const PropertyImageGallery = ({ images, alt, className = "" }: PropertyImageGalleryProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: images.length > 1, align: "start" });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  if (!images.length) {
    return (
      <div className={`rounded-2xl bg-muted flex items-center justify-center text-muted-foreground ${className}`}>
        No Image
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`}>
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {images.map((src, i) => (
            <div key={src + i} className="flex-[0_0_100%] min-w-0 h-full relative">
              <img src={src} alt={`${alt} ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors shadow-card"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={() => emblaApi?.scrollNext()}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors shadow-card"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-card/70 backdrop-blur-sm rounded-full px-2 py-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to image ${i + 1}`}
                onClick={() => emblaApi?.scrollTo(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === selected ? "bg-primary w-4" : "bg-foreground/40"}`}
              />
            ))}
          </div>

          <span className="absolute top-3 right-1/2 translate-x-1/2 bg-card/80 backdrop-blur-sm text-xs font-medium px-2.5 py-1 rounded-full">
            {selected + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  );
};

export default PropertyImageGallery;
