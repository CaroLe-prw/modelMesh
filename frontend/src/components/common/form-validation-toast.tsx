import { CircleAlert } from 'lucide-react';
import { toast } from 'sonner';

interface FormValidationToastOptions {
  description: string;
  id: string;
  issues: readonly string[];
  title: string;
}

export function showFormValidationToast({
  description,
  id,
  issues,
  title,
}: FormValidationToastOptions) {
  toast.error(title, {
    description: (
      <div className="grid gap-2">
        <p>{description}</p>
        <ul className="grid gap-1.5" role="list">
          {issues.map((issue, index) => (
            <li className="flex items-start gap-2" key={`${index}-${issue}`}>
              <CircleAlert
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-destructive"
              />
              <span>{issue}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
    duration: 8_000,
    id,
  });
}
