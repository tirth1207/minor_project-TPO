"use client";
import * as React from "react";
import Link from "next/link";
import { useMentor } from "./mentor-context";
import {
  IconAlertCircle,
  IconArrowRight,
  IconBriefcase,
  IconCheck,
  IconClock,
  IconRefresh,
  IconUsers,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AnalyticsBars,
  AnalyticsDonut,
} from "@/components/dashboard-analytics";
export default function MentorRootPage() {
  const { students, loading, refreshing, error, fetchData } = useMentor();
  const stats = React.useMemo(() => {
    const total = students.length,
      pending = students.filter((s) => s.profile_status === "PENDING").length,
      approved = students.filter((s) => s.profile_status === "APPROVED").length,
      rejected = students.filter((s) => s.profile_status === "REJECTED").length,
      placed = students.filter((s) => s.is_placed).length,
      averageCgpa = total
        ? students.reduce((s, x) => s + Number(x.cgpa || 0), 0) / total
        : 0;
    return {
      total,
      pending,
      approved,
      rejected,
      placed,
      averageCgpa,
      placementRate: total ? Math.round((placed / total) * 100) : 0,
    };
  }, [students]);
  if (loading)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <IconRefresh className="size-8 animate-spin" />
      </div>
    );
  if (error)
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <IconAlertCircle className="mx-auto size-6 text-destructive" />
          <p className="mt-2">{error}</p>
          <Button className="mt-4" onClick={() => fetchData(true)}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  const list = [...students]
    .sort((a, b) =>
      a.profile_status === "PENDING"
        ? -1
        : b.profile_status === "PENDING"
          ? 1
          : a.name.localeCompare(b.name),
    )
    .slice(0, 8);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mentor Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live verification, academic and placement analytics for your
            assigned students.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <IconRefresh
            className={refreshing ? "size-4 animate-spin" : "size-4"}
          />
          Refresh
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Students", stats.total, IconUsers],
          ["Pending", stats.pending, IconClock],
          ["Approved", stats.approved, IconCheck],
          ["Placed", stats.placed, IconBriefcase],
        ].map(([l, v, I]) => (
          <Card key={String(l)}>
            <CardContent className="mt-6">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {l.toString()}
                </span>
                {React.createElement(I as React.ElementType, {
                  className: "size-5 text-muted-foreground",
                })}
              </div>
              <p className="mt-2 text-3xl font-semibold">{v as number}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <AnalyticsDonut
          title="Profile verification"
          description="Live student profile status."
          data={[
            { label: "Approved", value: stats.approved },
            { label: "Pending", value: stats.pending },
            { label: "Rejected", value: stats.rejected },
          ]}
        />
        <AnalyticsBars
          title="Placement state"
          description={`${stats.placementRate}% placement rate.`}
          data={[
            { label: "Placed", value: stats.placed },
            {
              label: "Unplaced",
              value: Math.max(stats.total - stats.placed, 0),
            },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Academic snapshot</CardTitle>
            <CardDescription>
              Average performance of assigned students.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">
              {stats.averageCgpa.toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Average CGPA / 10.00
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground"
                style={{ width: `${Math.min(stats.averageCgpa * 10, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Students requiring attention
          </CardTitle>
          <CardDescription>
            Live student records prioritized by pending verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>CGPA</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.enrollment_no}
                    </p>
                  </TableCell>
                  <TableCell>{s.branch}</TableCell>
                  <TableCell>{Number(s.cgpa).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        s.profile_status === "APPROVED"
                          ? "default"
                          : s.profile_status === "REJECTED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {s.profile_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {s.is_placed ? (
                      <Badge>Placed</Badge>
                    ) : (
                      <Badge variant="outline">Unplaced</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/mentor/students?student=${s.id}`}>
                      <Button size="sm" variant="outline">
                        View <IconArrowRight className="size-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
