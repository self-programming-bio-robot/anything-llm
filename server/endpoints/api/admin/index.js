const { Invite } = require("../../../models/invite");
const { SystemSettings } = require("../../../models/systemSettings");
const { User } = require("../../../models/user");
const { Workspace } = require("../../../models/workspace");
const { ThreadChats } = require("../../../models/threadChats");
const { multiUserMode, reqBody } = require("../../../utils/http");
const { validApiKey } = require("../../../utils/middleware/validApiKey");

function apiAdminEndpoints(app) {
  if (!app) return;

  app.get("/v1/admin/is-multi-user-mode", [validApiKey], (_, response) => {
    /*
    #swagger.tags = ['Admin']
    #swagger.description = 'Check to see if the instance is in multi-user-mode first. Methods are disabled until multi user mode is enabled via the UI.'
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
             "isMultiUser": true
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
    */
    const isMultiUser = multiUserMode(response);
    response.status(200).json({ isMultiUser });
  });

  app.get("/v1/admin/users", [validApiKey], async (request, response) => {
    /*
    #swagger.tags = ['Admin']
    #swagger.description = 'Check to see if the instance is in multi-user-mode first. Methods are disabled until multi user mode is enabled via the UI.'
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
             "users": [
                {
                  username: "sample-sam",
                  role: 'default',
                }
             ]
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
     #swagger.responses[401] = {
      description: "Instance is not in Multi-User mode. Method denied",
    }
    */
    try {
      if (!multiUserMode(response)) {
        response.sendStatus(401).end();
        return;
      }

      const users = (await User.where()).map((user) => {
        const { password, ...rest } = user;
        return rest;
      });
      response.status(200).json({ users });
    } catch (e) {
      console.error(e);
      response.sendStatus(500).end();
    }
  });

  app.post("/v1/admin/users/new", [validApiKey], async (request, response) => {
    /*
    #swagger.tags = ['Admin']
    #swagger.description = 'Create a new user with username and password. Methods are disabled until multi user mode is enabled via the UI.'
    #swagger.requestBody = {
        description: 'Key pair object that will define the new user to add to the system.',
        required: true,
        type: 'object',
        content: {
          "application/json": {
            example: {
              username: "sample-sam",
              password: 'hunter2',
              role: 'default | admin'
            }
          }
        }
      }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              user: {
                id: 1,
                username: 'sample-sam',
                role: 'default',
              },
              error: null,
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
     #swagger.responses[401] = {
      description: "Instance is not in Multi-User mode. Method denied",
    }
    */
    try {
      if (!multiUserMode(response)) {
        response.sendStatus(401).end();
        return;
      }

      const newUserParams = reqBody(request);
      const { user: newUser, error } = await User.create(newUserParams);
      response.status(200).json({ user: newUser, error });
    } catch (e) {
      console.error(e);
      response.sendStatus(500).end();
    }
  });

  app.post("/v1/admin/users/:id", [validApiKey], async (request, response) => {
    /*
    #swagger.tags = ['Admin']
    #swagger.path = '/v1/admin/users/{id}'
    #swagger.parameters['id'] = {
      in: 'path',
      description: 'id of the user in the database.',
      required: true,
      type: 'string'
    }
    #swagger.description = 'Update existing user settings. Methods are disabled until multi user mode is enabled via the UI.'
    #swagger.requestBody = {
        description: 'Key pair object that will update the found user. All fields are optional and will not update unless specified.',
        required: true,
        type: 'object',
        content: {
          "application/json": {
            example: {
              username: "sample-sam",
              password: 'hunter2',
              role: 'default | admin',
              suspended: 0,
            }
          }
        }
      }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              success: true,
              error: null,
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
     #swagger.responses[401] = {
      description: "Instance is not in Multi-User mode. Method denied",
    }
    */
    try {
      if (!multiUserMode(response)) {
        response.sendStatus(401).end();
        return;
      }

      const { id } = request.params;
      const updates = reqBody(request);
      const user = await User.get({ id: Number(id) });

      // Check to make sure with this update that includes a role change to
      // something other than admin that we still have at least one admin left.
      if (
        updates.hasOwnProperty("role") && // has admin prop to change
        updates.role !== "admin" && // and we are changing to non-admin
        user.role === "admin" // and they currently are an admin
      ) {
        const adminCount = await User.count({ role: "admin" });
        if (adminCount - 1 <= 0) {
          response.status(200).json({
            success: false,
            error:
              "No system admins will remain if you do this. Update failed.",
          });
          return;
        }
      }

      const { success, error } = await User.update(id, updates);
      response.status(200).json({ success, error });
    } catch (e) {
      console.error(e);
      response.sendStatus(500).end();
    }
  });

  app.delete(
    "/v1/admin/users/:id",
    [validApiKey],
    async (request, response) => {
      /*
    #swagger.tags = ['Admin']
    #swagger.description = 'Delete existing user by id. Methods are disabled until multi user mode is enabled via the UI.'
    #swagger.path = '/v1/admin/users/{id}'
    #swagger.parameters['id'] = {
      in: 'path',
      description: 'id of the user in the database.',
      required: true,
      type: 'string'
    }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              success: true,
              error: null,
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
     #swagger.responses[401] = {
      description: "Instance is not in Multi-User mode. Method denied",
    }
    */
      try {
        if (!multiUserMode(response)) {
          response.sendStatus(401).end();
          return;
        }

        const { id } = request.params;
        await User.delete({ id });
        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get("/v1/admin/invites", [validApiKey], async (request, response) => {
    /*
    #swagger.tags = ['Admin']
    #swagger.description = 'List all existing invitations to instance regardless of status. Methods are disabled until multi user mode is enabled via the UI.'
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
             "invites": [
                {
                  id: 1,
                  status: "pending",
                  code: 'abc-123',
                  claimedBy: null
                }
             ]
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
     #swagger.responses[401] = {
      description: "Instance is not in Multi-User mode. Method denied",
    }
    */
    try {
      if (!multiUserMode(response)) {
        response.sendStatus(401).end();
        return;
      }

      const invites = await Invite.whereWithUsers();
      response.status(200).json({ invites });
    } catch (e) {
      console.error(e);
      response.sendStatus(500).end();
    }
  });

  app.post("/v1/admin/invite/new", [validApiKey], async (request, response) => {
    /*
    #swagger.tags = ['Admin']
    #swagger.description = 'Create a new invite code for someone to use to register with instance. Methods are disabled until multi user mode is enabled via the UI.'
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              invite: {
                id: 1,
                status: "pending",
                code: 'abc-123',
              },
              error: null,
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
     #swagger.responses[401] = {
      description: "Instance is not in Multi-User mode. Method denied",
    }
    */
    try {
      if (!multiUserMode(response)) {
        response.sendStatus(401).end();
        return;
      }

      const { invite, error } = await Invite.create();
      response.status(200).json({ invite, error });
    } catch (e) {
      console.error(e);
      response.sendStatus(500).end();
    }
  });

  app.delete(
    "/v1/admin/invite/:id",
    [validApiKey],
    async (request, response) => {
      /*
    #swagger.tags = ['Admin']
    #swagger.description = 'Deactivates (soft-delete) invite by id. Methods are disabled until multi user mode is enabled via the UI.'
    #swagger.path = '/v1/admin/invite/{id}'
    #swagger.parameters['id'] = {
      in: 'path',
      description: 'id of the invite in the database.',
      required: true,
      type: 'string'
    }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              success: true,
              error: null,
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
     #swagger.responses[401] = {
      description: "Instance is not in Multi-User mode. Method denied",
    }
    */
      try {
        if (!multiUserMode(response)) {
          response.sendStatus(401).end();
          return;
        }

        const { id } = request.params;
        const { success, error } = await Invite.deactivate(id);
        response.status(200).json({ success, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/v1/admin/workspaces/:workspaceId/update-users",
    [validApiKey],
    async (request, response) => {
      /*
    #swagger.tags = ['Admin']
    #swagger.path = '/v1/admin/workspaces/{workspaceId}/update-users'
    #swagger.parameters['workspaceId'] = {
      in: 'path',
      description: 'id of the workspace in the database.',
      required: true,
      type: 'string'
    }
    #swagger.description = 'Overwrite workspace permissions to only be accessible by the given user ids and admins. Methods are disabled until multi user mode is enabled via the UI.'
    #swagger.requestBody = {
        description: 'Entire array of user ids who can access the workspace. All fields are optional and will not update unless specified.',
        required: true,
        type: 'object',
        content: {
          "application/json": {
            example: {
              userIds: [1,2,4,12],
            }
          }
        }
      }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              success: true,
              error: null,
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
     #swagger.responses[401] = {
      description: "Instance is not in Multi-User mode. Method denied",
    }
    */
      try {
        if (!multiUserMode(response)) {
          response.sendStatus(401).end();
          return;
        }

        const { workspaceId } = request.params;
        const { userIds } = reqBody(request);
        const { success, error } = await Workspace.updateUsers(
          workspaceId,
          userIds
        );
        response.status(200).json({ success, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/v1/admin/workspace-chats",
    [validApiKey],
    async (request, response) => {
      /*
    #swagger.tags = ['Admin']
    #swagger.description = 'All chats in the system ordered by most recent. Methods are disabled until multi user mode is enabled via the UI.'
    #swagger.requestBody = {
        description: 'Page offset and filters to show of workspace chats. All fields are optional and will not update unless specified.',
        required: false,
        type: 'object',
        content: {
          "application/json": {
            example: {
              offset: 2,
              filters: {
                "rating": 1,
              }
            }
          }
        }
      }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              success: true,
              error: null,
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
    */
      try {
        const pgSize = 20;
        const { offset = 0, filters = {} } = reqBody(request);
        const chats = await ThreadChats.whereWithData(
          filters,
          pgSize,
          offset * pgSize,
          { id: "desc" }
        );

        const hasPages = (await ThreadChats.count()) > (offset + 1) * pgSize;
        response.status(200).json({ chats: chats, hasPages });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get("/v1/admin/preferences", [validApiKey], async (request, response) => {
    /*
    #swagger.tags = ['Admin']
    #swagger.description = 'Show all multi-user preferences for instance. Methods are disabled until multi user mode is enabled via the UI.'
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              settings: {
                users_can_delete_workspaces: true,
                limit_user_messages: false,
                message_limit: 10,
              }
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
     #swagger.responses[401] = {
      description: "Instance is not in Multi-User mode. Method denied",
    }
    */
    try {
      if (!multiUserMode(response)) {
        response.sendStatus(401).end();
        return;
      }

      const settings = {
        users_can_delete_workspaces:
          (await SystemSettings.get({ label: "users_can_delete_workspaces" }))
            ?.value === "true",
        limit_user_messages:
          (await SystemSettings.get({ label: "limit_user_messages" }))
            ?.value === "true",
        message_limit:
          Number(
            (await SystemSettings.get({ label: "message_limit" }))?.value
          ) || 10,
      };
      response.status(200).json({ settings });
    } catch (e) {
      console.error(e);
      response.sendStatus(500).end();
    }
  });

  app.post(
    "/v1/admin/preferences",
    [validApiKey],
    async (request, response) => {
      /*
    #swagger.tags = ['Admin']
    #swagger.description = 'Update multi-user preferences for instance. Methods are disabled until multi user mode is enabled via the UI.'
    #swagger.requestBody = {
      description: 'Object with setting key and new value to set. All keys are optional and will not update unless specified.',
      required: true,
      type: 'object',
      content: {
        "application/json": {
          example: {
            users_can_delete_workspaces: false,
            limit_user_messages: true,
            message_limit: 5,
          }
        }
      }
    }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              success: true,
              error: null,
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
     #swagger.responses[401] = {
      description: "Instance is not in Multi-User mode. Method denied",
    }
    */
      try {
        if (!multiUserMode(response)) {
          response.sendStatus(401).end();
          return;
        }

        const updates = reqBody(request);
        await SystemSettings.updateSettings(updates);
        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );
}

module.exports = { apiAdminEndpoints };
