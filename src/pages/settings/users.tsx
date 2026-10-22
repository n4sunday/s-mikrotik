import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/common";
import { CrudTable } from "@/components/crud-table";
import { useRosList } from "@/hooks/use-ros";

const POLICIES = "local,telnet,ssh,ftp,reboot,read,write,policy,test,winbox,password,web,sniff,sensitive,api,romon,rest-api";

export function UsersSettings() {
  const groups = useRosList("user/group");

  return (
    <>
      <PageHeader title="Users & Access" description="Administrator accounts and which management services are reachable." />
      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="active">Active Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <CrudTable
            path="user"
            noun="User"
            columns={[
              { key: "name", header: "Username", className: "font-medium" },
              { key: "group", header: "Group", render: (r) => <Badge variant="secondary">{r.group}</Badge> },
              { key: "address", header: "Allowed From", render: (r) => r.address || "Anywhere" },
              { key: "last-logged-in", header: "Last Login", className: "text-muted-foreground" },
              { key: "comment", header: "Description", render: (r) => <span className="text-muted-foreground">{r.comment}</span> },
            ]}
            defaults={{ group: "full" }}
            fields={[
              { name: "name", label: "Username", required: true },
              { name: "group", label: "Group", type: "select", options: (groups.data ?? []).map((g) => g.name!), required: true },
              { name: "password", label: "Password", type: "password", description: "Leave empty to keep the current password." },
              { name: "address", label: "Allowed from", placeholder: "Any address, e.g. 192.168.88.0/24" },
              { name: "comment", label: "Description" },
            ]}
          />
        </TabsContent>

        <TabsContent value="groups">
          <CrudTable
            path="user/group"
            noun="Group"
            columns={[
              { key: "name", header: "Name", className: "font-medium" },
              {
                key: "policy",
                header: "Permissions",
                render: (r) => (
                  <span className="flex flex-wrap gap-1">
                    {r.policy?.split(",").filter((p) => !p.startsWith("!")).map((p) => (
                      <Badge key={p} variant="secondary" className="h-4 text-[10px]">{p}</Badge>
                    ))}
                  </span>
                ),
                className: "whitespace-normal",
              },
            ]}
            defaults={{ policy: "read,web,api,rest-api" }}
            fields={[
              { name: "name", label: "Name", required: true },
              { name: "policy", label: "Policies", description: `Comma separated. Available: ${POLICIES}` },
              { name: "skin", label: "Skin" },
              { name: "comment", label: "Description" },
            ]}
          />
        </TabsContent>

        <TabsContent value="services">
          <CrudTable
            path="ip/service"
            noun="Service"
            allowCreate={false}
            allowDelete={false}
            columns={[
              { key: "name", header: "Service", className: "font-medium" },
              { key: "port", header: "Port", className: "tabular-nums" },
              { key: "address", header: "Allowed From", render: (r) => r.address || "Anywhere" },
              { key: "certificate", header: "Certificate", className: "text-muted-foreground" },
            ]}
            fields={[
              { name: "port", label: "Port", type: "number", required: true },
              { name: "address", label: "Allowed from", placeholder: "Comma separated subnets; empty = anywhere" },
              { name: "certificate", label: "Certificate (www-ssl, api-ssl)" },
            ]}
          />
        </TabsContent>

        <TabsContent value="active">
          <ActiveSessions />
        </TabsContent>
      </Tabs>
    </>
  );
}

function ActiveSessions() {
  const active = useRosList("user/active", { refetchInterval: 10_000 });
  if (active.isLoading) return <LoadingBlock />;
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {!active.data?.length ? (
        <EmptyState title="No active sessions" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">User</TableHead>
              <TableHead>Via</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Since</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.data.map((s) => (
              <TableRow key={s[".id"]} className="h-10">
                <TableCell className="pl-4 font-medium">{s.name}</TableCell>
                <TableCell><Badge variant="secondary">{s.via}</Badge></TableCell>
                <TableCell className="tabular-nums">{s.address}</TableCell>
                <TableCell className="text-muted-foreground">{s.when}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
