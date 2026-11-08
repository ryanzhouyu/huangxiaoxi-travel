-- R01 PostgreSQL 候选路线实验；仅在新建的隔离容器中执行。
-- 无认证服务、无正式配置；不可直接部署为业务 API。
CREATE SCHEMA alpha_spike;
SET search_path = alpha_spike;
CREATE TABLE accounts (id text PRIMARY KEY);
CREATE TABLE wallets (
  account_id text REFERENCES accounts(id), scene_id text NOT NULL,
  balance integer NOT NULL CHECK (balance >= 0), PRIMARY KEY(account_id,scene_id)
);
CREATE TABLE pools (id text PRIMARY KEY, scene_id text NOT NULL);
CREATE TABLE pool_assets (pool_id text REFERENCES pools(id), asset_id text NOT NULL, PRIMARY KEY(pool_id,asset_id));
CREATE TABLE unlocks (account_id text REFERENCES accounts(id), pool_id text REFERENCES pools(id), PRIMARY KEY(account_id,pool_id));
CREATE TABLE ownership (account_id text REFERENCES accounts(id), asset_id text NOT NULL, PRIMARY KEY(account_id,asset_id));
CREATE TABLE draws (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id text REFERENCES accounts(id), scene_id text NOT NULL,
  pool_id text REFERENCES pools(id), asset_id text NOT NULL,
  request_id text NOT NULL, UNIQUE(account_id,request_id)
);
CREATE TABLE ledger (
  draw_id bigint PRIMARY KEY REFERENCES draws(id), account_id text NOT NULL,
  scene_id text NOT NULL, delta integer NOT NULL CHECK(delta = -1), balance_after integer NOT NULL CHECK(balance_after >= 0)
);
CREATE TABLE requests (
  account_id text REFERENCES accounts(id), request_id text NOT NULL,
  input jsonb NOT NULL, result jsonb NOT NULL, PRIMARY KEY(account_id,request_id)
);

CREATE FUNCTION draw_reward(p_account text, p_scene text, p_pool text, p_request text, p_fail_after_debit boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SET search_path = alpha_spike AS $$
DECLARE
  old_request requests%ROWTYPE;
  picked text;
  ticket_balance integer;
  draw_id bigint;
  answer jsonb;
  payload jsonb := jsonb_build_object('sceneId',p_scene,'poolId',p_pool);
BEGIN
  -- 账号级锁使跨池、跨景区仍共享同一个拥有集合；正式服务先认证，再使用同一锁顺序。
  PERFORM 1 FROM accounts WHERE id=p_account FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO old_request FROM requests WHERE account_id=p_account AND request_id=p_request;
  IF FOUND THEN
    IF old_request.input <> payload THEN RAISE EXCEPTION 'REQUEST_CONFLICT'; END IF;
    RETURN old_request.result;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pools WHERE id=p_pool AND scene_id=p_scene) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT EXISTS (SELECT 1 FROM unlocks WHERE account_id=p_account AND pool_id=p_pool) THEN RAISE EXCEPTION 'POOL_LOCKED'; END IF;
  SELECT pa.asset_id INTO picked FROM pool_assets pa
    WHERE pa.pool_id=p_pool AND NOT EXISTS (SELECT 1 FROM ownership o WHERE o.account_id=p_account AND o.asset_id=pa.asset_id)
    ORDER BY random() LIMIT 1;
  IF picked IS NULL THEN
    answer := jsonb_build_object('code','POOL_COMPLETE');
  ELSE
    SELECT balance INTO ticket_balance FROM wallets WHERE account_id=p_account AND scene_id=p_scene FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_WALLET'; END IF;
    IF ticket_balance < 1 THEN
      answer := jsonb_build_object('code','INSUFFICIENT_BALANCE');
    ELSE
      UPDATE wallets SET balance=balance-1 WHERE account_id=p_account AND scene_id=p_scene RETURNING balance INTO ticket_balance;
      IF p_fail_after_debit THEN RAISE EXCEPTION 'INJECTED_FAILURE'; END IF;
      INSERT INTO ownership VALUES(p_account,picked);
      INSERT INTO draws(account_id,scene_id,pool_id,asset_id,request_id) VALUES(p_account,p_scene,p_pool,picked,p_request) RETURNING id INTO draw_id;
      INSERT INTO ledger VALUES(draw_id,p_account,p_scene,-1,ticket_balance);
      answer := jsonb_build_object('code','DRAWN','drawId',draw_id,'assetId',picked,'balanceAfter',ticket_balance);
    END IF;
  END IF;
  INSERT INTO requests VALUES(p_account,p_request,payload,answer);
  RETURN answer;
END $$;

INSERT INTO accounts VALUES ('same'),('last'),('global'),('rollback');
INSERT INTO wallets VALUES ('same','s1',2),('last','s1',1),('global','s1',1),('global','s2',1),('rollback','s1',1);
INSERT INTO pools VALUES ('p1','s1'),('p2','s2');
INSERT INTO pool_assets VALUES ('p1','shared'),('p2','shared');
INSERT INTO unlocks SELECT a.id,p.id FROM accounts a CROSS JOIN pools p;
