import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common";
import { CrudTable } from "@/components/crud-table";
import { cell, useOptions } from "@/components/settings-kit";
import { ros, type RosRecord } from "@/lib/api";
import { errorMessage, isTrue } from "@/lib/utils";

function daysLeft(r: RosRecord) {
  const raw = r["invalid-after"];
  if (!raw) return null;
  const t = Date.parse(raw.replace(" ", "T"));
  return Number.isNaN(t) ? null : Math.round((t - Date.now()) / 86_400_000);
}

export function CertificateSettings() {
  const qc = useQueryClient();
  const certs = useOptions("certificate");

  async function sign(r: RosRecord) {
    try {
      // Without a CA this produces a self-signed certificate (fine for the router's own CA or web UI).
      await ros.run("certificate/sign", { ".id": r[".id"], ...(r.ca ? { ca: r.ca } : {}) });
      toast.success(`${r.name} signed`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      qc.invalidateQueries({ queryKey: ["ros", "certificate"] });
    }
  }

  return (
    <>
      <PageHeader title="Certificates" description="TLS certificates for HTTPS, SSTP, OpenVPN and IPsec. Create a CA, then sign server certificates with it." />
      <CrudTable
        path="certificate"
        noun="Certificate"
        showToggle={false}
        searchKeys={["name", "common-name", "issuer"]}
        columns={[
          { key: "name", header: "Name", className: "font-medium" },
          { key: "common-name", header: "Common name" },
          {
            key: "flags",
            header: "Type",
            render: (r) => (
              <span className="flex flex-wrap gap-1">
                {r["key-usage"]?.includes("key-cert-sign") && <Badge className="bg-primary/15 text-primary">CA</Badge>}
                {isTrue(r["private-key"]) && <Badge variant="secondary">Private key</Badge>}
                {isTrue(r.trusted) && <Badge className="bg-success/15 text-success">Trusted</Badge>}
                {!r["invalid-after"] && <Badge variant="outline" className="text-warning">Unsigned</Badge>}
              </span>
            ),
          },
          {
            key: "invalid-after",
            header: "Expires",
            render: (r) => {
              const d = daysLeft(r);
              if (d === null) return cell.muted();
              return <span className={d < 30 ? "text-destructive" : "text-muted-foreground"}>{d < 0 ? "Expired" : `in ${d} days`}</span>;
            },
          },
        ]}
        rowActions={(r) =>
          !r["invalid-after"] && (
            <Button variant="outline" size="xs" onClick={() => sign(r)}>
              <BadgeCheckIcon /> Sign
            </Button>
          )
        }
        defaults={{ "key-size": "2048", "days-valid": "3650" }}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "common-name", label: "Common name", placeholder: "router.lan or your DDNS name", required: true },
          { name: "subject-alt-name", label: "Alternative names", placeholder: "DNS:router.lan,IP:192.168.88.1" },
          { name: "key-type", label: "Key type", type: "select", options: ["rsa", "ec"] },
          { name: "key-size", label: "Key size", type: "select", options: ["2048", "4096", "prime256v1", "secp384r1"] },
          { name: "days-valid", label: "Valid for (days)", type: "number" },
          {
            name: "key-usage",
            label: "Usage",
            type: "select",
            options: [
              { label: "Certificate authority (CA)", value: "key-cert-sign,crl-sign" },
              { label: "TLS server", value: "digital-signature,key-encipherment,tls-server" },
              { label: "TLS client", value: "digital-signature,key-encipherment,tls-client" },
            ],
          },
          { name: "ca", label: "Sign with CA", type: "select", options: certs, description: "Leave empty for self-signed." },
          { name: "trusted", label: "Trusted", type: "switch" },
        ]}
      />
    </>
  );
}
