import type { Connector, CaptureOptions, ImportOptions, ConnectorMetadata } from "@boardroom/core";
import type { Thread, ThreadMetadata } from "@boardroom/core";

/** Base class for all platform connectors */
export abstract class BaseConnector implements Connector {
  abstract readonly platform: string;
  abstract readonly displayName: string;

  abstract capture(options: CaptureOptions): Promise<Thread>;
  abstract import(transcript: string, options: ImportOptions): Promise<Thread>;
  abstract identify(rawSession: unknown): Promise<ThreadMetadata>;
  abstract metadata(rawSession: unknown): Promise<ConnectorMetadata>;
  abstract supports(input: unknown): boolean;
}
