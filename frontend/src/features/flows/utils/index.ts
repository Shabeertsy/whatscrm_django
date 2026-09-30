import { FlowScreen, ApiConfig } from "../types";


export const uid = () => Math.random().toString(36).slice(2, 8);

// Screen IDs must only contain alphabets and underscores (WhatsApp Flow JSON spec)
export const alphaId = (len = 6) =>
  Array.from({ length: len }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");



export const defaultApiConfig = (): ApiConfig => ({
  url: "",
  id_field: "id",
  label_field: "name",
  results_key: "",
  filter_param: "",
  screen: "",
  headers: {},
});



/** True if the screen AFTER index idx contains at least one API-backed dynamic field. */
export function hasDynamicFieldOnNextScreen(screens: FlowScreen[], idx: number): boolean {
  if (idx >= screens.length - 1) return false;
  return screens[idx + 1].fields.some(f => f.type === "dynamic_dropdown" || f.type === "dynamic_checkbox");
}


/** Extract data_api_config from all screens' API-backed dynamic fields. */
export function buildDataApiConfig(screens: FlowScreen[]): Record<string, object> {
  const config: Record<string, object> = {};
  for (const screen of screens) {
    for (const field of screen.fields) {
      const isDynamic = field.type === "dynamic_dropdown" || field.type === "dynamic_checkbox";
      if (isDynamic && field.apiConfig) {
        config[field.id] = { ...field.apiConfig, screen: screen.id, field_type: field.type };
      }
    }
  }
  return config;
}


export function buildFlowJson(screens: FlowScreen[]): object {
  return {
    version: "6.0",
    routing_model: screens.reduce((acc, screen, idx) => {
      acc[screen.id] = idx < screens.length - 1 ? [screens[idx + 1].id] : [];
      return acc;
    }, {} as Record<string, string[]>),
    screens: screens.map((screen, idx) => {
      const isLast = idx === screens.length - 1;
      const nextScreenId = !isLast ? screens[idx + 1].id : "";

      const getSafeKey = (label: string) =>
        label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

      const previousScreensPayload = screens.slice(0, idx).reduce((acc, s) => {
        s.fields.forEach(f => {
          const key = f.name || getSafeKey(f.label) || f.id;
          acc[key] = `\${data.${key}}`;
        });
        return acc;
      }, {} as Record<string, string>);

      const currentScreenPayload = screen.fields.reduce((acc, f) => {
        const key = f.name || getSafeKey(f.label) || f.id;
        acc[key] = `\${form.${f.id}}`;
        return acc;
      }, {} as Record<string, string>);

      const combinedPayload = { ...previousScreensPayload, ...currentScreenPayload };

      // Footer on-click-action (note: hyphenated key required by Meta spec)
      const footerAction = isLast
        ? { name: "complete", payload: combinedPayload }
        : { name: "data_exchange", payload: { screen: nextScreenId, ...combinedPayload } };

      const dataSchema: Record<string, any> = {};

      //  Add schema for dynamic fields on CURRENT screen
      screen.fields.forEach(f => {
        if (f.type === "dynamic_dropdown" || f.type === "dynamic_checkbox") {
          dataSchema[f.id] = {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                description: { type: "string" }
              }
            },
            __example__: [
              { id: "opt1", title: "Option 1", description: "Description 1" },
              { id: "opt2", title: "Option 2", description: "Description 2" }
            ]
          };
        }
      });

      //  Add schema for fields from PREVIOUS screens (needed for the payload pass-through)
      screens.slice(0, idx).forEach(s => {
        s.fields.forEach(f => {
          const key = f.name || getSafeKey(f.label) || f.id;
          if (f.type === "checkbox" || f.type === "dynamic_checkbox") {
            dataSchema[key] = { type: "array", items: { type: "string" }, __example__: ["opt1"] };
          } else {
            dataSchema[key] = { type: "string", __example__: "example text" };
          }
        });
      });

      const screenConfig: any = {
        id: screen.id,
        title: screen.title,
        terminal: isLast,
        layout: {
          type: "SingleColumnLayout",
          children: [
            {
              type: "Form",
              name: "form",
              children: screen.fields.map((f) => {
                const base = { name: f.id, label: f.label, required: f.required };
                if (f.type === "text_input") return { type: "TextInput", ...base };
                if (f.type === "textarea") return { type: "TextArea", ...base };
                if (f.type === "dropdown") return { type: "Dropdown", ...base, "data-source": f.options.map(o => ({ id: getSafeKey(o.label) || o.id, title: o.label })) };
                if (f.type === "radio") return { type: "RadioButtonsGroup", ...base, "data-source": f.options.map(o => ({ id: getSafeKey(o.label) || o.id, title: o.label })) };
                if (f.type === "checkbox") return { type: "CheckboxGroup", ...base, "data-source": f.options.map(o => ({ id: getSafeKey(o.label) || o.id, title: o.label })) };
                if (f.type === "dynamic_dropdown") return { type: "Dropdown", ...base, "data-source": `\${data.${f.id}}` };
                if (f.type === "dynamic_checkbox") return { type: "CheckboxGroup", ...base, "data-source": `\${data.${f.id}}` };
                return base;
              }),
            },
            // directly in layout.children
            {
              type: "Footer",
              label: isLast ? "Submit" : "Next",
              "on-click-action": footerAction,
            },
          ],
        },
      };

      if (Object.keys(dataSchema).length > 0) {
        screenConfig.data = dataSchema;
      }

      return screenConfig;
    }),
  };
}
