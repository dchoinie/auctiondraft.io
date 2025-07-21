import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export function NavCard({
  title,
  description,
  icon,
  href,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}) {
  const router = useRouter();
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-primary/50 bg-gray-700/70"
      onClick={() => router.push(href)}
    >
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        {icon}
        <CardTitle className="text-lg text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm pb-2">
        {description}
      </CardContent>
    </Card>
  );
}
