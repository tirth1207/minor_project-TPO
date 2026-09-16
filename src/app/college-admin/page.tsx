"use client";

import * as React from "react";
import { useCollegeAdmin } from "./college-admin-context";
import Link from "next/link";
import {
  IconSchool,
  IconBriefcase,
  IconUsers,
  IconArrowRight,
  IconTicket,
  IconAward,
  IconPlus,
} from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AnalyticsBars,
  AnalyticsDonut,
} from "@/components/dashboard-analytics";

export default function CollegeAdminRootPage() {
  const {
    departments,
    invites,
    jobMappings,
    students,
    mentors,
    orgStatus,
    deptName,
    setDeptName,
    handleCreateDept,
  } = useCollegeAdmin();
  const placed = students.filter((s) => s.is_placed).length,
    total = students.length,
    rate = total ? Math.round((placed / total) * 100) : 0;
  const profile = [
    {
      label: "Approved",
      value: students.filter((s) => s.profile_status === "APPROVED").length,
    },
    {
      label: "Pending",
      value: students.filter((s) => s.profile_status === "PENDING").length,
    },
    {
      label: "Rejected",
      value: students.filter((s) => s.profile_status === "REJECTED").length,
    },
  ];
  const jobs = [
    {
      label: "Approved",
      value: jobMappings.filter((m) => m.local_status === "APPROVED").length,
    },
    {
      label: "Pending",
      value: jobMappings.filter((m) => m.local_status === "PENDING").length,
    },
    {
      label: "Rejected",
      value: jobMappings.filter((m) => m.local_status === "REJECTED").length,
    },
  ];
  const mentor = [
    {
      label: "Approved",
      value: mentors.filter((m) => m.profile_status === "APPROVED").length,
    },
    {
      label: "Pending",
      value: mentors.filter((m) => m.profile_status === "PENDING").length,
    },
    {
      label: "Rejected",
      value: mentors.filter((m) => m.profile_status === "REJECTED").length,
    },
  ];
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">College Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live placement, student and recruitment analytics for your
            institute.
          </p>
        </div>
        <Badge>{orgStatus}</Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Placement Rate", `${rate}%`, IconAward],
          ["Departments", departments.length, IconSchool],
          ["Students", total, IconUsers],
          ["Mentors", mentors.length, IconUsers],
          ["Campus Drives", jobMappings.length, IconBriefcase],
        ].map(([l, v, I]) => (
          <Card key={String(l)}>
            <CardContent className="mt-6">
              <div className="flex justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {l.toString()}
                </span>
                {React.createElement(I as React.ElementType, {
                  className: "size-4 text-muted-foreground",
                })}
              </div>
              <p className="mt-2 text-3xl font-semibold">
                {v as string | number}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <AnalyticsDonut
          title="Student profile approval"
          description="Live profile status distribution."
          data={profile}
        />
        <AnalyticsDonut
          title="Drive approvals"
          description="Campus drive mapping status."
          data={jobs}
        />
        <AnalyticsDonut
          title="Mentor verification"
          description="Faculty mentor profile status."
          data={mentor}
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <AnalyticsBars
          title="Institute overview"
          description="Live counts from the current college scope."
          data={[
            { label: "Departments", value: departments.length },
            { label: "Students", value: students.length },
            { label: "Mentors", value: mentors.length },
            { label: "Campus drives", value: jobMappings.length },
            { label: "Invite links", value: invites.length },
          ]}
        />
        <AnalyticsBars
          title="Placement state"
          description={`${placed} of ${total} students are currently placed.`}
          data={[
            { label: "Placed", value: placed },
            { label: "Unplaced", value: Math.max(total - placed, 0) },
          ]}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Department overview</CardTitle>
          <CardDescription>Current branches in this institute.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((d) => (
              <div key={d.id} className="rounded-xl border p-3">
                <div className="flex justify-between gap-3">
                  <span className="text-sm font-medium">{d.name}</span>
                  <Badge variant="outline">{d.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Add Department</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateDept} className="flex gap-2">
            <input
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="Department name"
              className="h-9 flex-1 rounded-lg border px-3 text-sm"
              required
            />
            <Button type="submit">
              <IconPlus className="size-4" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
