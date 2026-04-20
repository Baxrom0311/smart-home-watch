import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  return (
    <div className="flex min-h-[60vh] items-center justify-center page-fade">
      <div className="text-center">
        <div className="font-display text-6xl font-semibold text-primary">404</div>
        <p className="mt-2 text-muted-foreground">Sahifa topilmadi: {location.pathname}</p>
        <Button asChild className="mt-6">
          <Link to="/">
            <Home className="h-4 w-4 mr-2" />
            Bosh sahifaga qaytish
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
