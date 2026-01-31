import { getGlobalOptions } from "@/lib/globals";
import {
  printError,
  printErrorMessageWithReason,
  printObject,
  printSuccess,
} from "@/lib/output";
import { getAPIClient } from "@/lib/trpc";
import { Command } from "@commander-js/extra-typings";
import { getBorderCharacters, table } from "table";

import { listsToTree } from "@karakeep/shared/utils/listUtils";

export const listsCmd = new Command()
  .name("lists")
  .description("manipulating lists");

listsCmd
  .command("create")
  .description("creates a new list")
  .requiredOption("--name <name>", "the name of the list")
  .option("--icon <icon>", "the icon for the list (emoji)", "🗂️")
  .option("--description <description>", "the description of the list")
  .option("--type <type>", "the type of the list (manual or smart)", "manual")
  .option("--query <query>", "the search query for smart lists")
  .option("--parent <parentId>", "the parent list id for nested lists")
  .action(async (opts) => {
    const api = getAPIClient();

    const listType = opts.type as "manual" | "smart";

    if (listType === "smart" && !opts.query) {
      printErrorMessageWithReason("Failed to create list", {
        message: "Smart lists require a --query option",
      });
      return;
    }

    if (listType === "manual" && opts.query) {
      printErrorMessageWithReason("Failed to create list", {
        message: "Manual lists cannot have a --query option",
      });
      return;
    }

    try {
      const resp = await api.lists.create.mutate({
        name: opts.name,
        icon: opts.icon,
        description: opts.description,
        type: listType,
        query: opts.query,
        parentId: opts.parent,
      });

      if (getGlobalOptions().json) {
        printObject(resp);
      } else {
        printSuccess(
          `Successfully created list "${resp.name}" with id "${resp.id}"`,
        )();
      }
    } catch (error) {
      printErrorMessageWithReason("Failed to create list", error as object);
    }
  });

listsCmd
  .command("edit")
  .description("edits an existing list")
  .argument("<id>", "the id of the list to edit")
  .option("--name <name>", "the new name for the list")
  .option("--icon <icon>", "the new icon for the list (emoji)")
  .option("--description <description>", "the new description for the list")
  .option(
    "--parent <parentId>",
    "the new parent list id (use 'none' to remove parent)",
  )
  .option("--query <query>", "the new search query for smart lists")
  .option("--public", "make the list public")
  .option("--private", "make the list private")
  .action(async (id, opts) => {
    const api = getAPIClient();

    if (opts.public && opts.private) {
      printErrorMessageWithReason("Failed to edit list", {
        message: "Cannot specify both --public and --private",
      });
      return;
    }

    // Check if at least one option is provided
    if (
      !opts.name &&
      !opts.icon &&
      opts.description === undefined &&
      !opts.parent &&
      !opts.query &&
      opts.public === undefined &&
      opts.private === undefined
    ) {
      printErrorMessageWithReason("Failed to edit list", {
        message: "At least one option must be provided to edit the list",
      });
      return;
    }

    try {
      const updateData: {
        listId: string;
        name?: string;
        icon?: string;
        description?: string | null;
        parentId?: string | null;
        query?: string;
        public?: boolean;
      } = { listId: id };

      if (opts.name) {
        updateData.name = opts.name;
      }
      if (opts.icon) {
        updateData.icon = opts.icon;
      }
      if (opts.description !== undefined) {
        updateData.description = opts.description;
      }
      if (opts.parent) {
        updateData.parentId = opts.parent === "none" ? null : opts.parent;
      }
      if (opts.query) {
        updateData.query = opts.query;
      }
      if (opts.public !== undefined) {
        updateData.public = true;
      }
      if (opts.private !== undefined) {
        updateData.public = false;
      }

      const resp = await api.lists.edit.mutate(updateData);

      if (getGlobalOptions().json) {
        printObject(resp);
      } else {
        printSuccess(`Successfully updated list "${resp.name}"`)();
      }
    } catch (error) {
      printErrorMessageWithReason("Failed to edit list", error as object);
    }
  });

listsCmd
  .command("list")
  .description("lists all lists")
  .action(async () => {
    const api = getAPIClient();

    try {
      const resp = await api.lists.list.query();

      if (getGlobalOptions().json) {
        printObject(resp);
      } else {
        const { allPaths } = listsToTree(resp.lists);
        const data: string[][] = [["Id", "Name"]];

        allPaths.forEach((path) => {
          const name = path.map((p) => `${p.icon} ${p.name}`).join(" / ");
          const id = path[path.length - 1].id;
          data.push([id, name]);
        });
        console.log(
          table(data, {
            border: getBorderCharacters("ramac"),
            singleLine: true,
          }),
        );
      }
    } catch (error) {
      printErrorMessageWithReason("Failed to list all lists", error as object);
    }
  });

listsCmd
  .command("delete")
  .description("deletes a list")
  .argument("<id>", "the id of the list")
  .action(async (id) => {
    const api = getAPIClient();

    await api.lists.delete
      .mutate({
        listId: id,
      })
      .then(printSuccess(`Successfully deleted list with id "${id}"`))
      .catch(printError(`Failed to delete list with id "${id}"`));
  });

export async function addToList(listId: string, bookmarkId: string) {
  const api = getAPIClient();

  await api.lists.addToList
    .mutate({
      listId,
      bookmarkId,
    })
    .then(
      printSuccess(
        `Successfully added bookmark "${bookmarkId}" to list with id "${listId}"`,
      ),
    )
    .catch(
      printError(
        `Failed to add bookmark "${bookmarkId}" to list with id "${listId}"`,
      ),
    );
}

listsCmd
  .command("get")
  .description("gets all the ids of the bookmarks assigned to the list")
  .requiredOption("--list <id>", "the id of the list")
  .action(async (opts) => {
    const api = getAPIClient();
    try {
      let resp = await api.bookmarks.getBookmarks.query({ listId: opts.list });
      let results: string[] = resp.bookmarks.map((b) => b.id);
      while (resp.nextCursor) {
        resp = await api.bookmarks.getBookmarks.query({
          listId: opts.list,
          cursor: resp.nextCursor,
        });
        results = [...results, ...resp.bookmarks.map((b) => b.id)];
      }

      printObject(results);
    } catch (error) {
      printErrorMessageWithReason(
        "Failed to get the ids of the bookmarks in the list",
        error as object,
      );
    }
  });

listsCmd
  .command("add-bookmark")
  .description("add a bookmark to list")
  .requiredOption("--list <id>", "the id of the list")
  .requiredOption("--bookmark <bookmark>", "the id of the bookmark")
  .action(async (opts) => {
    await addToList(opts.list, opts.bookmark);
  });

listsCmd
  .command("remove-bookmark")
  .description("remove a bookmark from list")
  .requiredOption("--list <id>", "the id of the list")
  .requiredOption("--bookmark <bookmark>", "the id of the bookmark")
  .action(async (opts) => {
    const api = getAPIClient();

    await api.lists.removeFromList
      .mutate({
        listId: opts.list,
        bookmarkId: opts.bookmark,
      })
      .then(
        printSuccess(
          `Successfully removed bookmark "${opts.bookmark}" from list with id "${opts.list}"`,
        ),
      )
      .catch(
        printError(
          `Failed to remove bookmark "${opts.bookmark}" from list with id "${opts.list}"`,
        ),
      );
  });
