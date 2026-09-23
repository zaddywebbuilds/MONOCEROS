"use client";

import * as React from "react";
import { useActionState } from "react";
import { FileCheck2, Upload } from "lucide-react";

import { SubmitButton } from "@/components/ui/interactive";
import { Field, FormError, FormSuccess, Input, Select } from "@/components/ui/form";
import { InfoNote } from "@/components/ui/feedback";
import { submitKycAction } from "@/server/actions/account";
import { idleState } from "@/lib/action-state";
import { ID_DOCUMENT_LABELS } from "@/lib/validation/platform";
import { compressImage, formatBytes, replaceInputFile } from "@/lib/client/compress-image";

export function KycForm({
  allowedIdTypes,
  maxUploadMb,
  ninRequired,
}: {
  allowedIdTypes: string[];
  maxUploadMb: number;
  ninRequired: boolean;
}) {
  const [state, formAction] = useActionState(submitKycAction, idleState);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [fileNote, setFileNote] = React.useState<string | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [preparing, setPreparing] = React.useState(false);
  const error = (name: string) => state.fieldErrors?.[name];

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const original = input.files?.[0];
    setFileError(null);
    setFileNote(null);

    if (!original) {
      setFileName(null);
      return;
    }

    setPreparing(true);
    // Phone photos routinely exceed the upload ceiling, so they are resized
    // here rather than being rejected back to someone standing with a phone
    // and no way to shrink a file.
    const prepared = await compressImage(original);
    if (prepared !== original) replaceInputFile(input, prepared);
    setPreparing(false);

    if (prepared.size > maxUploadMb * 1024 * 1024) {
      setFileError(
        `That file is ${formatBytes(prepared.size)}, over the ${maxUploadMb}MB limit. A photograph usually works better than a scan or PDF.`,
      );
      setFileName(null);
      input.value = "";
      return;
    }

    setFileName(prepared.name);
    setFileNote(
      prepared === original
        ? formatBytes(prepared.size)
        : `${formatBytes(prepared.size)} · resized for upload`,
    );
  }

  return (
    <form action={formAction} className="space-y-5" encType="multipart/form-data" noValidate>
      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <Field
        label="National Identification Number (NIN)"
        htmlFor="nin"
        required={ninRequired}
        hint="11 digits, exactly as issued by NIMC."
        error={error("nin")}
      >
        <Input
          id="nin"
          name="nin"
          inputMode="numeric"
          maxLength={11}
          placeholder="12345678901"
          required={ninRequired}
          aria-invalid={Boolean(error("nin"))}
        />
      </Field>

      <Field label="Identity document type" htmlFor="idType" required error={error("idType")}>
        <Select id="idType" name="idType" required defaultValue={allowedIdTypes[0]}>
          {allowedIdTypes.map((type) => (
            <option key={type} value={type}>
              {ID_DOCUMENT_LABELS[type as keyof typeof ID_DOCUMENT_LABELS] ?? type}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Document number"
        htmlFor="idNumber"
        hint="Optional — leave blank if your document does not show one."
        error={error("idNumber")}
      >
        <Input id="idNumber" name="idNumber" />
      </Field>

      <Field
        label="Upload your document"
        htmlFor="document"
        required
        hint={`JPG, PNG or PDF. Photographs are resized automatically, so a picture straight from your phone is fine — just make sure every corner is visible and the text is readable. PDFs must be under ${maxUploadMb}MB.`}
        error={fileError ?? error("document")}
      >
        <label
          htmlFor="document"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink-600 bg-ink-900/50 px-4 py-8 text-center transition-colors hover:border-accent-700 hover:bg-ink-880/60"
        >
          {preparing ? (
            <>
              <Upload className="size-6 animate-pulse text-fg-subtle" aria-hidden />
              <span className="text-[13px] font-medium text-fg">Preparing your document…</span>
            </>
          ) : fileName ? (
            <>
              <FileCheck2 className="size-6 text-accent-400" aria-hidden />
              <span className="text-[13px] font-medium text-fg">{fileName}</span>
              <span className="text-[12px] text-fg-subtle">
                {fileNote ? `${fileNote} · ` : null}Choose a different file
              </span>
            </>
          ) : (
            <>
              <Upload className="size-6 text-fg-subtle" aria-hidden />
              <span className="text-[13px] font-medium text-fg">Select a file</span>
              <span className="text-[12px] text-fg-subtle">JPG, PNG or PDF</span>
            </>
          )}
          <input
            id="document"
            name="document"
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="sr-only"
            onChange={onFileChange}
            required
          />
        </label>
      </Field>

      <InfoNote>
        Your document is stored privately and is never published. Only authorised compliance staff
        can open it, through links that expire, and every access is recorded.
      </InfoNote>

      <SubmitButton block pendingLabel="Uploading…">
        Submit for verification
      </SubmitButton>
    </form>
  );
}
