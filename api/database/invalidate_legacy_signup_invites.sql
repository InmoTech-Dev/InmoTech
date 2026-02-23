/*
  Rollout one-time script.
  Invalidates legacy public-signup invitations that are still active.
*/

UPDATE Invitaciones
SET usado_en = GETDATE()
WHERE tipo = 'signup_verify'
  AND usado_en IS NULL
  AND expira_en > GETDATE();
