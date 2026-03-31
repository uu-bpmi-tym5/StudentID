"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Radio,
  Settings,
  TrendingUp,
  ClipboardCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { LogoWithText } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

const mainNav = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Events",
    href: "/events",
    icon: CalendarDays,
  },
  {
    title: "My Attendance",
    href: "/my-attendance",
    icon: ClipboardCheck,
    roles: ["student"] as const,
  },
];

const manageNav = [
  {
    title: "Students",
    href: "/students",
    icon: GraduationCap,
    roles: ["admin", "teacher"] as const,
  },
  {
    title: "Tappers",
    href: "/tappers",
    icon: Radio,
    roles: ["admin"] as const,
  },
  {
    title: "NFC Cards",
    href: "/cards",
    icon: CreditCard,
    roles: ["admin"] as const,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: TrendingUp,
    roles: ["admin", "teacher"] as const,
  },
];

const bottomNav = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["admin"] as const,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, startSignOut] = useTransition();

  // TODO: Replace with actual user data from Supabase auth
  const user = {
    name: "Admin User",
    email: "admin@university.edu",
    role: "admin" as const,
  };

  function handleSignOut() {
    startSignOut(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="px-4 py-5">
        <Link href="/dashboard">
          <LogoWithText />
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="px-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={isActive(item.href)}
                    className={cn(
                      "transition-colors",
                      isActive(item.href) &&
                        "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Manage Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            Manage
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {manageNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={isActive(item.href)}
                    className={cn(
                      "transition-colors",
                      isActive(item.href) &&
                        "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-4">
        <SidebarMenu>
          {bottomNav.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                render={<Link href={item.href} />}
                isActive={isActive(item.href)}
                className={cn(
                  "transition-colors",
                  isActive(item.href) &&
                    "bg-primary/10 text-primary font-medium"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          <SidebarSeparator className="my-2" />

          {/* User info */}
          <SidebarMenuItem>
            <SidebarMenuButton className="h-auto py-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary/15 font-mono text-xs font-bold text-primary">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-medium">
                  {user.name}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {user.role}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>{isSigningOut ? "Signing out…" : "Sign out"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
