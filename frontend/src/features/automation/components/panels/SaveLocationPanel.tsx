import React, { useEffect, useState } from "react";
import { FieldGroup, FieldSelect } from "../ui/FormFields";
import { accountsApi, Location } from "../../../../api/accounts";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
}

export function SaveLocationPanel({ nodeId, data, update }: Props) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await accountsApi.listLocations();
        const locsData = res.data;
        setLocations(Array.isArray(locsData) ? locsData : (locsData as any).results ?? []);
      } catch (err) {
        toast.error("Failed to load locations");
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedLoc = locations.find((l) => l.id === selectedId);
    update(nodeId, {
      locationId: selectedId,
      locationName: selectedLoc ? selectedLoc.name : "",
    });
  };

  return (
    <div className="space-y-4">
      <FieldGroup label="Select Location for Chat">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading locations...
          </div>
        ) : (
          <FieldSelect
            value={(data.locationId as string) || ""}
            onChange={handleChange}
            focus="focusRose"
          >
            <option value="">-- Select a Location --</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </FieldSelect>
        )}
      </FieldGroup>
    </div>
  );
}

export default SaveLocationPanel;
