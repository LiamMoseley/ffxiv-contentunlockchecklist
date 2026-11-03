# Entry identity is derived from its content

An entry's ID is calculated from its normalised content name and unlocking quest name. Level, notes, location, position and section heading are left out, so ordinary wiki edits never detach a character's progress. When two rows share a name and quest, the expansion and then order of appearance tell them apart. A rename changes the ID: the old status is kept as an orphaned status and offered to the player as a suggested match, and it is never moved without their say-so.

The ID is derived rather than assigned so that every device calculates the same ID for the same row. With assigned IDs carried forward by matching against the previous snapshot, two devices updating separately could give one entry different IDs, which would break sync (ADR-0001).
