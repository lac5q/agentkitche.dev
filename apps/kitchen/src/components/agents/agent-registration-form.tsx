"use client";

import { useState } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RegisterAgentInput } from "@/types";

interface AgentRegistrationFormProps {
  onSubmit: (input: RegisterAgentInput) => void;
  isSubmitting?: boolean;
}

export function AgentRegistrationForm({ onSubmit, isSubmitting = false }: AgentRegistrationFormProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [capabilities, setCapabilities] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!id || !role.trim()) return;
    onSubmit({
      id,
      name: name.trim(),
      role: role.trim(),
      platform: "codex",
      protocol: "rest",
      capabilities: capabilities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => ({ id: item.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: item, description: "", tags: [] })),
      issueApiKey: true,
    });
    setName("");
    setRole("");
    setCapabilities("");
  }

  return (
    <form onSubmit={handleSubmit} className="border border-slate-800 bg-slate-900/40 p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <Input
          aria-label="Agent name"
          placeholder="Agent name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          aria-label="Agent role"
          placeholder="Role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        />
        <Input
          aria-label="Agent capabilities"
          placeholder="Capabilities, comma separated"
          value={capabilities}
          onChange={(event) => setCapabilities(event.target.value)}
        />
        <Button type="submit" disabled={isSubmitting}>
          Register
        </Button>
      </div>
    </form>
  );
}
