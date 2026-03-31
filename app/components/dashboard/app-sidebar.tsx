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
import type { Profile, UserRole } from "@/lib/supabase/types";

const mainNav = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "teacher"] as UserRole[],
  },
  {
    title: "Events",
    href: "/events",
    icon: CalendarDays,
    roles: ["admin", "teacher"] as UserRole[],
  },
  {
    title: "My Attendance",
    href: "/my-attendance",
    icon: ClipboardCheck,
    roles: ["student"] as UserRole[],
  },
];

const manageNav = [
  {
    title: "Students",
    href: "/students",
    icon: GraduationCap,
    roles: ["admin", "teacher"] as UserRole[],
  },
  {
    title: "Tappers",
    href: "/tappers",
    icon: Radio,
    roles: ["admin"] as UserRole[],
  },
  {
    title: "NFC Cards",
    href: "/cards",
    icon: CreditCard,
    roles: ["admin"] as UserRole[],
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: TrendingUp,
    roles: ["admin", "teacher"] as UserRole[],
  },
];

const bottomNav = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["admin"] as UserRole[],
  },
];

type AppSidebarProps = {
  profile: Profile | null;
};

export function AppSidebar({ profile }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, startSignOut] = useTransition();

  const role: UserRole = profile?.role ?? "student";

  const filteredMainNav = mainNav.filter(
    (item) => !item.roles || item.roles.includes(role)
  );
  const filteredManageNav = manageNav.filter(
    (item) => !item.roles || item.roles.includes(role)
  );
  const filteredBottomNav = bottomNav.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

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
        <Link href={role === "student" ? "/my-attendance" : "/dashboard"}>
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
              {filteredMainNav.map((item) => (
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

        {/* Manage Section — only rendered for admin/teacher */}
        {filteredManageNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
              Manage
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredManageNav.map((item) => (
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
        )}
      </SidebarContent>

      <SidebarFooter className="px-2 pb-4">
        <SidebarMenu>
          {filteredBottomNav.map((item) => (
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
                {(profile?.full_name ?? "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-medium">
                  {profile?.full_name ?? "User"}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {role}
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


