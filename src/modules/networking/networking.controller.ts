
import { Response } from "express";

import { AuthRequest } from "../auth/auth.middleware";
import { NetworkingService } from "./networking.service";

export class NetworkingController {
  private readonly service = new NetworkingService();

  // ============================================
  // ROUTE PARAMETER HELPER
  // ============================================

  private getRouteParam(
    value: string | string[] | undefined,
  ): string | null {
    if (!value) return null;

    return Array.isArray(value) ? value[0] ?? null : value;
  }

  // ============================================
  // AUTH HELPERS
  // ============================================

  private getUserId(req: AuthRequest): string | null {
    return req.user?.userId ?? null;
  }

  private unauthorized(res: Response): void {
    res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  private handleError(
    res: Response,
    error: unknown,
    message: string,
  ): void {
    console.error(error);

    res.status(500).json({
      success: false,
      message,
    });
  }

  // ============================================
  // GET MATCHES
  // ============================================

  async getMatches(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      if (!userId) return this.unauthorized(res);

      const eventId = this.getRouteParam(req.params.eventId);

      if (!eventId) {
        res.status(400).json({
          success: false,
          message: "Event ID is required.",
        });
        return;
      }

      const limit = Math.min(
        Math.max(Number(req.query.limit) || 20, 1),
        50,
      );

      const matches = await this.service.getMatches(
        userId,
        eventId,
        limit,
      );

      res.status(200).json({
        success: true,
        matches,
      });
    } catch (error) {
      this.handleError(
        res,
        error,
        "Failed to retrieve networking matches.",
      );
    }
  }

  // ============================================
  // GET NETWORKING PROFILE
  // ============================================

  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      if (!userId) return this.unauthorized(res);

      const profile = await this.service.getProfile(userId);

      res.status(200).json({
        success: true,
        profile,
      });
    } catch (error) {
      this.handleError(
        res,
        error,
        "Failed to retrieve networking profile.",
      );
    }
  }

  // ============================================
  // UPDATE NETWORKING PROFILE
  // ============================================

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      if (!userId) return this.unauthorized(res);

      const profile = await this.service.updateProfile(
        userId,
        req.body,
      );

      res.status(200).json({
        success: true,
        message: "Networking profile updated.",
        profile,
      });
    } catch (error) {
      this.handleError(
        res,
        error,
        "Failed to update networking profile.",
      );
    }
  }

  // ============================================
  // SEND CONNECTION REQUEST
  // ============================================

  async sendRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      if (!userId) return this.unauthorized(res);

      const receiverId = req.body.receiverId;
      const eventId = req.body.eventId;
      const message = req.body.message;

      if (!receiverId || !eventId) {
        res.status(400).json({
          success: false,
          message: "Receiver ID and event ID are required.",
        });
        return;
      }

      const request = await this.service.sendRequest(
        userId,
        receiverId,
        eventId,
        message,
      );

      res.status(201).json({
        success: true,
        message: "Connection request sent.",
        request,
      });
    } catch (error) {
      this.handleError(
        res,
        error,
        "Failed to send connection request.",
      );
    }
  }

  // ============================================
  // ACCEPT REQUEST
  // ============================================

  async acceptRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      if (!userId) return this.unauthorized(res);

      const requestId = this.getRouteParam(req.params.requestId);

      if (!requestId) {
        res.status(400).json({
          success: false,
          message: "Request ID is required.",
        });
        return;
      }

      const connection = await this.service.acceptRequest(
        userId,
        requestId,
      );

      res.status(200).json({
        success: true,
        message: "Connection request accepted.",
        connection,
      });
    } catch (error) {
      this.handleError(
        res,
        error,
        "Failed to accept connection request.",
      );
    }
  }

  // ============================================
  // REJECT REQUEST
  // ============================================

  async rejectRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      if (!userId) return this.unauthorized(res);

      const requestId = this.getRouteParam(req.params.requestId);

      if (!requestId) {
        res.status(400).json({
          success: false,
          message: "Request ID is required.",
        });
        return;
      }

      const request = await this.service.rejectRequest(
        userId,
        requestId,
      );

      res.status(200).json({
        success: true,
        message: "Connection request rejected.",
        request,
      });
    } catch (error) {
      this.handleError(
        res,
        error,
        "Failed to reject connection request.",
      );
    }
  }

  // ============================================
  // CANCEL REQUEST
  // ============================================

  async cancelRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      if (!userId) return this.unauthorized(res);

      const requestId = this.getRouteParam(req.params.requestId);

      if (!requestId) {
        res.status(400).json({
          success: false,
          message: "Request ID is required.",
        });
        return;
      }

      const request = await this.service.cancelRequest(
        userId,
        requestId,
      );

      res.status(200).json({
        success: true,
        message: "Connection request cancelled.",
        request,
      });
    } catch (error) {
      this.handleError(
        res,
        error,
        "Failed to cancel connection request.",
      );
    }
  }

  // ============================================
  // INCOMING REQUESTS
  // ============================================

  async getIncomingRequests(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = this.getUserId(req);
      if (!userId) return this.unauthorized(res);

      const requests = await this.service.getIncomingRequests(userId);

      res.status(200).json({
        success: true,
        requests,
      });
    } catch (error) {
      this.handleError(
        res,
        error,
        "Failed to retrieve incoming requests.",
      );
    }
  }

  // ============================================
  // OUTGOING REQUESTS
  // ============================================

  async getOutgoingRequests(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = this.getUserId(req);
      if (!userId) return this.unauthorized(res);

      const requests = await this.service.getOutgoingRequests(userId);

      res.status(200).json({
        success: true,
        requests,
      });
    } catch (error) {
      this.handleError(
        res,
        error,
        "Failed to retrieve outgoing requests.",
      );
    }
  }

  // ============================================
  // ACCEPTED CONNECTIONS
  // ============================================

  async getConnections(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      if (!userId) return this.unauthorized(res);

      const connections = await this.service.getConnections(userId);

      res.status(200).json({
        success: true,
        connections,
      });
    } catch (error) {
      this.handleError(
        res,
        error,
        "Failed to retrieve connections.",
      );
    }
  }

  // ============================================
  // REMOVE CONNECTION
  // ============================================

  async removeConnection(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      if (!userId) return this.unauthorized(res);

      const connectionId = this.getRouteParam(
        req.params.connectionId,
      );

      if (!connectionId) {
        res.status(400).json({
          success: false,
          message: "Connection ID is required.",
        });
        return;
      }

      await this.service.removeConnection(
        userId,
        connectionId,
      );

      res.status(200).json({
        success: true,
        message: "Connection removed.",
      });
    } catch (error) {
      this.handleError(
        res,
        error,
        "Failed to remove connection.",
      );
    }
  }
}
