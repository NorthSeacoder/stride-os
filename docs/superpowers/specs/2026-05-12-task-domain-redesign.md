# Task Domain Redesign

## Goal

Redesign the task experience in the initial Stride OS build so task management uses:

- a denser full-viewport workspace
- collapsible global navigation
- a three-column task workspace
- real user lists
- smart date-based views driven by a single task date
- recurring task support
- a shared create/edit modal

This is an initial-build redesign. Backward migration compatibility is out of scope.

## Product Decisions

The design is locked to these decisions:

- task domain is rebuilt instead of incrementally patched
- a task has one date field: `dueDate`
- `Inbox` is a required system list and default destination
- completed tasks keep both `completedAt` and original `dueDate`
- recurring task generation is definition-based, not instance-self-mutating
- recurring generation only needs to ensure the current day instance exists

## Non-Goals

- backward migration from the current task schema
- preserving old task status semantics such as `today`, `scheduled`, or `todayType`
- notifications, reminders, or background jobs
- advanced list customization beyond minimal create/select
- collaborative task sharing
- rich markdown editing in the first version

## Layout Redesign

### Global Workspace

The dashboard shell should use noticeably less outer padding so the working area sits closer to the viewport edges.

Requirements:

- reduce the current wide outer whitespace
- keep content readable, but bias toward workspace density
- preserve responsive behavior on desktop and smaller widths

### Global Navigation

The left global navigation must support two modes:

- expanded: icon + label
- collapsed: icon-only narrow rail

Requirements:

- visible toggle control
- immediate interaction with no page reload
- active state remains readable in both modes
- local persistence via `localStorage`
- if persistence is absent temporarily, interaction must still work

## Task Workspace

The task page becomes a fixed three-column workspace:

1. source column: smart views + user lists
2. task list column: active source task list
3. detail column: selected task detail

Requirements:

- clear vertical separators between columns
- task list column and detail column each scroll independently
- each of those columns should have a sticky top toolbar inside its own scroll container

## Data Model

This redesign should use a new task domain model. Do not preserve the old task status architecture.

### `task_lists`

Fields:

- `id`
- `name`
- `icon`
- `kind`: `system | user`
- `slug`
- `sortOrder`
- `archivedAt`
- `createdAt`
- `updatedAt`

Rules:

- `Inbox` is a required system list
- user-created lists live beside system lists in the first column
- user tasks always belong to one list

### `task_definitions`

Purpose:

- stores reusable recurring task definitions

Fields:

- `id`
- `title`
- `description`
- `listId`
- `dueDateMode`
- `frequency`: `daily | weekly | monthly | weekdays | weekends`
- `endType`: `never | until_date | after_count`
- `endDate` nullable
- `occurrenceCount` nullable
- `createdAt`
- `updatedAt`

Notes:

- the single-date product rule still holds for task instances
- `dueDateMode` exists only so recurring generation can derive each new instance date from the current occurrence
- this first version can keep `dueDateMode` minimal and internal if needed

### `tasks`

Purpose:

- stores executable task instances only

Fields:

- `id`
- `title`
- `description`
- `listId`
- `dueDate` nullable
- `completedAt` nullable
- `definitionId` nullable
- `createdAt`
- `updatedAt`

Rules:

- non-recurring tasks have `definitionId = null`
- recurring-generated tasks point to their source definition
- completed tasks remain in `tasks`; they are not copied elsewhere

## Why Definitions Are Required

Recurring support still needs a definition layer.

Reason:

- recurrence rule answers when to generate
- definition answers what to generate
- executed task instances must remain historically stable
- editing a recurring task must affect future instances without mutating past completed ones

Without definitions, recurrence would be attached directly to executable tasks and would create ambiguity around source-of-truth, history, and edit scope.

## Smart Views

The first column includes system smart views with counts:

- `All`
- `Today`
- `Tomorrow`
- `Inbox`
- `Next 7 Days`

These are query views, not stored lists.

Single-date rule:

- all smart-view filtering is derived from `dueDate`

Definitions:

- `All`: all executable tasks, split into open groups plus completed group
- `Today`: `dueDate = today`
- `Tomorrow`: `dueDate = tomorrow`
- `Inbox`: `list = Inbox`
- `Next 7 Days`: `dueDate between today and today + 6`

Each smart view still includes its own `Completed` group based on the same view scope.

## User Lists

The first column also includes a user list section.

Requirements:

- each item shows icon, name, and count
- provide a minimal create-list entry point in the first column
- initial create-list fields:
  - `name`
  - `icon`
- selecting a list updates the second-column source and title

## Source Selection State

The page needs two core state ids:

- `selectedSourceId`
- `selectedTaskId`

Rules:

- `selectedSourceId` drives the second column dataset and title
- `selectedTaskId` drives the third column detail panel
- switching source may clear task selection if the selected task is not in the new source result

## Task List Column

### Top Bar

The second column top bar includes:

- source-column collapse/expand control
- current source title
- sort button placeholder
- more actions placeholder
- quick-add input

### Quick Add

Behavior:

- default destination is `Inbox`
- if user is inside a concrete user list, default to that list
- if user is inside `Today`, prefill `dueDate = today`
- if user is inside `Tomorrow`, prefill `dueDate = tomorrow`
- otherwise quick add can leave `dueDate` empty

### Row Layout

Each task row shows:

- checkbox
- title
- list marker when current source is not a concrete list
- due date when present

Interactions:

- checkbox toggles completion
- clicking the row excluding checkbox selects the task for the detail column
- edit opens the shared create/edit modal

## Grouping Rules

Grouping is always required, and `Completed` must always exist.

### In a User List View

Group by time semantics:

- overdue
- today
- tomorrow
- upcoming
- no date
- completed

### In a Smart View

First filter by the smart-view scope, then group within that scope.

Examples:

- `Today` mainly shows today-due tasks, plus a scoped completed group
- `All` can show the full set of open time groups plus completed

Completed group behavior:

- always visible as a section
- may be collapsible
- may initially limit item count with a `See more` affordance

Completed row style:

- checked checkbox
- visually muted title

## Detail Column

The third column is primarily a read view.

When a task is selected:

- show title
- show description

When no task is selected:

- show empty state

The detail panel follows second-column selection changes immediately.

## Shared Create/Edit Modal

One modal and one field set must be used for both create and edit.

Fields:

- title
- description
- due date
- recurrence section
- list selector

### Date Section

Requirements:

- quick date shortcuts such as today, tomorrow, next week
- calendar picker

### Recurrence Section

Expandable section.

Fields:

- frequency:
  - daily
  - weekly
  - monthly
  - weekdays
  - weekends
- end mode:
  - never
  - until date
  - after count

Rules:

- no recurrence means create/update a normal task instance
- recurrence enabled means create/update a definition and ensure the current-day instance exists if due today under the current rule

### List Selector

Requirements:

- single list selection
- source options come from the first-column list dataset

### Footer

Controls:

- clear
- confirm

Submission behavior:

- close modal on success
- refresh visible task data
- show error feedback on failure

## Recurring Generation Rules

Recurring generation is definition-driven and current-day-only.

Requirements:

- do not pre-generate large future ranges
- ensure at most one executable instance exists for one definition on one occurrence date
- editing a definition affects future generated tasks only
- historical tasks remain unchanged

For the first version, the system only needs to ensure today’s required instances exist.

If a future smart view such as `Tomorrow` needs recurring instances, that can be implemented by explicitly ensuring that view’s target day on read. That is not required for the first version.

## Query and Service Boundaries

The redesign should expose clean task-domain operations.

### List Operations

- create list
- list lists with counts

### Task Operations

- query tasks by selected source
- group tasks for the second column
- get task detail
- create normal task
- update normal task
- toggle completion

### Definition Operations

- create recurring definition
- update recurring definition
- ensure today instances exist

## Error, Empty, and Loading States

Minimum UI coverage is required for:

- no user lists beyond system lists
- no tasks in current source
- no selected task
- failed list/task/detail requests
- pending creation or save actions

## Testing Scope

Required coverage:

- global navigation collapse and expand interaction
- local persistence of nav state
- source selection updates second-column dataset
- task selection updates third-column detail
- smart-view filtering uses only `dueDate`
- list counts render correctly
- quick-add default list and date behavior
- completion moves a task into the current source `Completed` group
- create and edit share the same modal field set
- recurring definition creation works
- recurring definition ensures only one today instance per definition
- editing a recurring definition affects future generation only
- empty, loading, and error states render basic UI correctly

## Delivery Shape

This redesign should be delivered as the new initial task foundation, not as an additive layer over the old task architecture.

That means:

- new layout behavior is the primary path
- new task domain model is the primary path
- old task status concepts are not design constraints

