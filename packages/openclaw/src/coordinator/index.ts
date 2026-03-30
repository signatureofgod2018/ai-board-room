import type { Connector, CaptureOptions, Platform } from "@basilica/core";

/**
 * AgentCoordinator — routes conversation traffic to the correct
 * platform connector and manages multi-agent workflows.
 */
export class AgentCoordinator {
  private connectors = new Map<Platform, Connector>();

  registerConnector(connector: Connector): void {
    this.connectors.set(connector.platform, connector);
  }

  getConnector(platform: Platform): Connector {
    const connector = this.connectors.get(platform);
    if (!connector) throw new Error(`No connector registered for platform: ${platform}`);
    return connector;
  }

  listPlatforms(): Platform[] {
    return Array.from(this.connectors.keys());
  }

  async route(platform: Platform, options: CaptureOptions) {
    const connector = this.getConnector(platform);
    return connector.capture(options);
  }
}
