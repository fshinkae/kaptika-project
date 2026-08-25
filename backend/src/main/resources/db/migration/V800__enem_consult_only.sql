-- Hardening/arquitetura — enem.dev apenas como consulta (não persistir conteúdo)
-- O acervo de questões deixa de ser materializado: a API é consultada ao vivo
-- para exibir e corrigir. O banco passa a guardar SÓ referência (source_id/ano/
-- índice) e o resultado do estudante (acerto/erro). Migração DESTRUTIVA
-- autorizada: descarta o acervo e os dados de sessão de teste.
--
-- `truncate` preserva as tabelas que ficam (e o RLS já habilitado em V700);
-- `questions`/`question_alternatives` são removidas por completo (continham os
-- gabaritos gravados).

truncate table answers, session_questions, study_sessions cascade;

-- session_questions: referência em vez de FK para questions
alter table session_questions drop constraint uq_session_question;
alter table session_questions drop constraint session_questions_question_id_fkey;
alter table session_questions drop column question_id;
alter table session_questions add column source_id varchar(80) not null;
alter table session_questions add column origin_year int not null;
alter table session_questions add column question_index int not null;
alter table session_questions add constraint uq_session_question unique (session_id, source_id);

-- answers: resultado referenciado por source_id (sem FK para questions)
alter table answers drop constraint uq_answers_session_question;
alter table answers drop constraint answers_question_id_fkey;
alter table answers drop column question_id;
alter table answers add column source_id varchar(80) not null;
alter table answers add constraint uq_answers_session_source unique (session_id, source_id);

-- remove o acervo persistido (inclui os gabaritos)
drop table question_alternatives;
drop table questions;
