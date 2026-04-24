import { Star } from "lucide-react";

export interface ReviewData {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  avatar: string;
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? "fill-secondary text-secondary" : "text-muted-foreground/30"}`}
      />
    ))}
    <span className="ml-1.5 text-sm font-semibold text-foreground">{rating.toFixed(1)}</span>
  </div>
);

export const ReviewCard = ({ review }: { review: ReviewData }) => (
  <div className="bg-muted/50 rounded-xl p-4 space-y-2">
    <div className="flex items-center gap-3">
      {review.avatar ? (
        <img src={review.avatar} alt={review.userName} className="w-9 h-9 rounded-full object-cover" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
          {review.userName.charAt(0)}
        </div>
      )}
      <div>
        <p className="text-sm font-semibold">{review.userName}</p>
        <p className="text-xs text-muted-foreground">{review.date}</p>
      </div>
    </div>
    <StarRating rating={review.rating} />
    {review.comment && <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>}
  </div>
);

export default StarRating;
