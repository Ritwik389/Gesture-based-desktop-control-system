import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Status() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/");
  }, []);
  return null;
}
