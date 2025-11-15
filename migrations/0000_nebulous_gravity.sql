CREATE TABLE "alimentos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "alimentos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"codigo_produto" text NOT NULL,
	"nome" text NOT NULL,
	"unidade" text NOT NULL,
	"lote" text NOT NULL,
	"data_fabricacao" text NOT NULL,
	"data_validade" text NOT NULL,
	"quantidade" real DEFAULT 0 NOT NULL,
	"peso_por_caixa" real,
	"temperatura" text NOT NULL,
	"shelf_life" integer NOT NULL,
	"data_entrada" text NOT NULL,
	"data_saida" text,
	"categoria" varchar(100),
	"alertas_config" jsonb NOT NULL,
	"cadastrado_por" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"alimento_id" integer,
	"alimento_codigo" text,
	"alimento_nome" text,
	"action" text NOT NULL,
	"user_id" varchar NOT NULL,
	"user_name" text NOT NULL,
	"changes" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modelos_produtos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "modelos_produtos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"codigo_produto" text NOT NULL,
	"descricao" text NOT NULL,
	"temperatura" text NOT NULL,
	"shelf_life" integer NOT NULL,
	"gtin" text,
	"peso_embalagem" real,
	"peso_por_caixa" real,
	"empresa" text,
	"peso_liquido" real,
	"tipo_peso" text,
	"quantidade_por_caixa" integer,
	"unidade_padrao" text DEFAULT 'kg' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"cadastrado_por" varchar NOT NULL,
	"data_atualizacao" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "modelos_produtos_codigo_produto_unique" UNIQUE("codigo_produto")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"reset_token" text,
	"reset_token_expiry" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"color" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_color_unique" UNIQUE("color")
);
--> statement-breakpoint
ALTER TABLE "alimentos" ADD CONSTRAINT "alimentos_cadastrado_por_users_id_fk" FOREIGN KEY ("cadastrado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;