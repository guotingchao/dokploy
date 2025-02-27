import { ShowDockerLogs } from "@/components/dashboard/application/logs/show";
import { ShowAdvancedMariadb } from "@/components/dashboard/mariadb/advanced/show-mariadb-advanced-settings";
import { ShowBackupMariadb } from "@/components/dashboard/mariadb/backups/show-backup-mariadb";
import { DeleteMariadb } from "@/components/dashboard/mariadb/delete-mariadb";
import { ShowMariadbEnvironment } from "@/components/dashboard/mariadb/environment/show-mariadb-environment";
import { ShowExternalMariadbCredentials } from "@/components/dashboard/mariadb/general/show-external-mariadb-credentials";
import { ShowGeneralMariadb } from "@/components/dashboard/mariadb/general/show-general-mariadb";
import { ShowInternalMariadbCredentials } from "@/components/dashboard/mariadb/general/show-internal-mariadb-credentials";
import { UpdateMariadb } from "@/components/dashboard/mariadb/update-mariadb";
import { DockerMonitoring } from "@/components/dashboard/monitoring/docker/show";
import { MariadbIcon } from "@/components/icons/data-tools-icons";
import { ProjectLayout } from "@/components/layouts/project-layout";
import { StatusTooltip } from "@/components/shared/status-tooltip";
import { Badge } from "@/components/ui/badge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
} from "@/components/ui/breadcrumb";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { appRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import { validateRequest } from "@dokploy/server";
import { createServerSideHelpers } from "@trpc/react-query/server";
import { HelpCircle, ServerOff } from "lucide-react";
import type {
	GetServerSidePropsContext,
	InferGetServerSidePropsType,
} from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState, type ReactElement } from "react";
import superjson from "superjson";

type TabState = "projects" | "monitoring" | "settings" | "backups" | "advanced";

const Mariadb = (
	props: InferGetServerSidePropsType<typeof getServerSideProps>,
) => {
	const { mariadbId, activeTab } = props;
	const router = useRouter();
	const { projectId } = router.query;
	const [tab, setSab] = useState<TabState>(activeTab);
	const { data } = api.mariadb.one.useQuery({ mariadbId });
	const { data: auth } = api.auth.get.useQuery();
	const { data: user } = api.user.byAuthId.useQuery(
		{
			authId: auth?.id || "",
		},
		{
			enabled: !!auth?.id && auth?.rol === "user",
		},
	);

	return (
		<div className="pb-10">
			<div className="flex flex-col gap-4">
				<Breadcrumb>
					<BreadcrumbItem>
						<BreadcrumbLink as={Link} href="/dashboard/projects">
							Projects
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbItem>
						<BreadcrumbLink
							as={Link}
							href={`/dashboard/project/${data?.project.projectId}`}
						>
							{data?.project.name}
						</BreadcrumbLink>
					</BreadcrumbItem>

					<BreadcrumbItem isCurrentPage>
						<BreadcrumbLink>{data?.name}</BreadcrumbLink>
					</BreadcrumbItem>
				</Breadcrumb>
				<Head>
					<title>
						Database: {data?.name} - {data?.project.name} | Dokploy
					</title>
				</Head>
				<header className="mb-6 flex w-full items-center justify-between max-sm:flex-wrap gap-4">
					<div className="flex  flex-col justify-between w-fit gap-2">
						<div className="flex flex-row items-center gap-2 xl:gap-4 flex-wrap">
							<h1 className="flex items-center gap-2 text-xl font-bold lg:text-3xl">
								{data?.name}
							</h1>
							<span className="text-sm">{data?.appName}</span>
						</div>
						<div className="flex flex-row h-fit w-fit gap-2">
							<Badge
								variant={
									!data?.serverId
										? "default"
										: data?.server?.serverStatus === "active"
											? "default"
											: "destructive"
								}
							>
								{data?.server?.name || "Dokploy Server"}
							</Badge>
							{data?.server?.serverStatus === "inactive" && (
								<TooltipProvider delayDuration={0}>
									<Tooltip>
										<TooltipTrigger asChild>
											<Label className="break-all w-fit flex flex-row gap-1 items-center">
												<HelpCircle className="size-4 text-muted-foreground" />
											</Label>
										</TooltipTrigger>
										<TooltipContent
											className="z-[999] w-[300px]"
											align="start"
											side="top"
										>
											<span>
												You cannot, deploy this application because the server
												is inactive, please upgrade your plan to add more
												servers.
											</span>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
						</div>
						{data?.description && (
							<p className="text-sm text-muted-foreground  max-w-6xl">
								{data?.description}
							</p>
						)}
					</div>
					<div className="relative flex flex-row gap-4">
						<div className="absolute -right-1  -top-2">
							<StatusTooltip status={data?.applicationStatus} />
						</div>
						<MariadbIcon className="h-8 w-8 text-muted-foreground" />
					</div>
				</header>
			</div>
			{data?.server?.serverStatus === "inactive" ? (
				<div className="flex h-[55vh] border-2 rounded-xl border-dashed p-4">
					<div className="max-w-3xl mx-auto flex flex-col items-center justify-center self-center gap-3">
						<ServerOff className="size-10 text-muted-foreground self-center" />
						<span className="text-center text-base text-muted-foreground">
							This service is hosted on the server {data.server.name}, but this
							server has been disabled because your current plan doesn't include
							enough servers. Please purchase more servers to regain access to
							this application.
						</span>
						<span className="text-center text-base text-muted-foreground">
							Go to{" "}
							<Link href="/dashboard/settings/billing" className="text-primary">
								Billing
							</Link>
						</span>
					</div>
				</div>
			) : (
				<Tabs
					value={tab}
					defaultValue="general"
					className="w-full"
					onValueChange={(e) => {
						setSab(e as TabState);
						const newPath = `/dashboard/project/${projectId}/services/mariadb/${mariadbId}?tab=${e}`;

						router.push(newPath, undefined, { shallow: true });
					}}
				>
					<div className="flex flex-row items-center justify-between  w-full gap-4">
						<TabsList
							className={cn(
								"md:grid md:w-fit max-md:overflow-y-scroll justify-start",
								data?.serverId ? "md:grid-cols-5" : "md:grid-cols-6",
							)}
						>
							<TabsTrigger value="general">General</TabsTrigger>
							<TabsTrigger value="environment">Environment</TabsTrigger>
							{!data?.serverId && (
								<TabsTrigger value="monitoring">Monitoring</TabsTrigger>
							)}
							<TabsTrigger value="backups">Backups</TabsTrigger>
							<TabsTrigger value="logs">Logs</TabsTrigger>
							<TabsTrigger value="advanced">Advanced</TabsTrigger>
						</TabsList>
						<div className="flex flex-row gap-2">
							<UpdateMariadb mariadbId={mariadbId} />
							{(auth?.rol === "admin" || user?.canDeleteServices) && (
								<DeleteMariadb mariadbId={mariadbId} />
							)}
						</div>
					</div>

					<TabsContent value="general">
						<div className="flex flex-col gap-4 pt-2.5">
							<ShowGeneralMariadb mariadbId={mariadbId} />
							<ShowInternalMariadbCredentials mariadbId={mariadbId} />
							<ShowExternalMariadbCredentials mariadbId={mariadbId} />
						</div>
					</TabsContent>
					<TabsContent value="environment">
						<div className="flex flex-col gap-4 pt-2.5">
							<ShowMariadbEnvironment mariadbId={mariadbId} />
						</div>
					</TabsContent>
					{!data?.serverId && (
						<TabsContent value="monitoring">
							<div className="flex flex-col gap-4 pt-2.5">
								<DockerMonitoring appName={data?.appName || ""} />
							</div>
						</TabsContent>
					)}
					<TabsContent value="logs">
						<div className="flex flex-col gap-4  pt-2.5">
							<ShowDockerLogs
								serverId={data?.serverId || ""}
								appName={data?.appName || ""}
							/>
						</div>
					</TabsContent>
					<TabsContent value="backups">
						<div className="flex flex-col gap-4 pt-2.5">
							<ShowBackupMariadb mariadbId={mariadbId} />
						</div>
					</TabsContent>
					<TabsContent value="advanced">
						<div className="flex flex-col gap-4 pt-2.5">
							<ShowAdvancedMariadb mariadbId={mariadbId} />
						</div>
					</TabsContent>
				</Tabs>
			)}
		</div>
	);
};

export default Mariadb;
Mariadb.getLayout = (page: ReactElement) => {
	return <ProjectLayout>{page}</ProjectLayout>;
};

export async function getServerSideProps(
	ctx: GetServerSidePropsContext<{ mariadbId: string; activeTab: TabState }>,
) {
	const { query, params, req, res } = ctx;
	const activeTab = query.tab;

	const { user, session } = await validateRequest(req, res);
	if (!user) {
		return {
			redirect: {
				permanent: true,
				destination: "/",
			},
		};
	}
	// Fetch data from external API
	const helpers = createServerSideHelpers({
		router: appRouter,
		ctx: {
			req: req as any,
			res: res as any,
			db: null as any,
			session: session,
			user: user,
		},
		transformer: superjson,
	});

	if (typeof params?.mariadbId === "string") {
		try {
			await helpers.mariadb.one.fetch({
				mariadbId: params?.mariadbId,
			});

			return {
				props: {
					trpcState: helpers.dehydrate(),
					mariadbId: params?.mariadbId,
					activeTab: (activeTab || "general") as TabState,
				},
			};
		} catch (error) {
			return {
				redirect: {
					permanent: false,
					destination: "/dashboard/projects",
				},
			};
		}
	}

	return {
		redirect: {
			permanent: false,
			destination: "/",
		},
	};
}
