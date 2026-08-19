-- ============================================================
-- GYM API - 005_indexes.sql
-- Índices para columnas usadas frecuentemente en búsquedas
-- ============================================================

CREATE INDEX members_document_number_idx ON members(document_number);

CREATE INDEX memberships_member_id_idx ON memberships(member_id);
CREATE INDEX memberships_plan_id_idx ON memberships(plan_id);
CREATE INDEX memberships_status_idx ON memberships(status);
CREATE INDEX memberships_end_date_idx ON memberships(end_date);

CREATE INDEX payments_member_id_idx ON payments(member_id);
CREATE INDEX payments_membership_id_idx ON payments(membership_id);
CREATE INDEX payments_payment_date_idx ON payments(payment_date);
CREATE INDEX payments_status_idx ON payments(status);

CREATE INDEX trainers_user_id_idx ON trainers(user_id);
CREATE INDEX trainers_status_idx ON trainers(status);

CREATE INDEX exercises_muscle_group_idx ON exercises(muscle_group);
CREATE INDEX exercises_difficulty_idx ON exercises(difficulty);

CREATE INDEX routines_member_id_idx ON routines(member_id);
CREATE INDEX routines_trainer_id_idx ON routines(trainer_id);
CREATE INDEX routines_status_idx ON routines(status);

CREATE INDEX routine_exercises_routine_id_idx ON routine_exercises(routine_id);
CREATE INDEX routine_exercises_exercise_id_idx ON routine_exercises(exercise_id);

CREATE INDEX attendance_member_id_idx ON attendance(member_id);
CREATE INDEX attendance_date_idx ON attendance(date);

CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_read_idx ON notifications(read);