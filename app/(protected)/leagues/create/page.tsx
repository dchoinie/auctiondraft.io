"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PageTitle from "@/components/PageTitle";
import Link from "next/link";
import { useUser } from "@/stores/userStore";
import { Plus, Info, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DEFAULTS = {
  name: "",
  leagueSize: 10,
  draftDate: "",
  draftTime: "",
  draftLocation: "",
  qbSlots: 1,
  rbSlots: 2,
  wrSlots: 2,
  teSlots: 1,
  flexSlots: 1,
  dstSlots: 1,
  kSlots: 1,
  benchSlots: 7,
  draftType: "snake",
  timerEnabled: false,
  timerDuration: 60,
};

interface LeagueFormValues {
  name: string;
  leagueSize: number;
  draftDate: string;
  draftTime: string;
  draftLocation: string;
  qbSlots: number;
  rbSlots: number;
  wrSlots: number;
  teSlots: number;
  flexSlots: number;
  dstSlots: number;
  kSlots: number;
  benchSlots: number;
  draftType: string;
  timerEnabled: boolean;
  timerDuration: number;
  joinCode: string | null;
}

export default function CreateLeaguePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<LeagueFormValues>({
    defaultValues: DEFAULTS,
  });

  const timerEnabled = watch("timerEnabled");

  const onSubmit = async (data: LeagueFormValues) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      // Convert timerEnabled to int for backend
      const payload = {
        ...data,
        joinCode: data.joinCode || null,
        timerEnabled: data.timerEnabled ? 1 : 0,
        leagueSize: Number(data.leagueSize),
        qbSlots: Number(data.qbSlots),
        rbSlots: Number(data.rbSlots),
        wrSlots: Number(data.wrSlots),
        teSlots: Number(data.teSlots),
        flexSlots: Number(data.flexSlots),
        dstSlots: Number(data.dstSlots),
        kSlots: Number(data.kSlots),
        benchSlots: Number(data.benchSlots),
        timerDuration: data.timerEnabled ? Number(data.timerDuration) : 60,
      };
      const res = await fetch("/api/leagues/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success && result.league) {
        setSuccess("League created successfully!");
        setTimeout(() => {
          router.push(`/leagues/${result.league.id}`);
        }, 1000);
      } else {
        setError(result.error || "Failed to create league");
      }
    } catch (e) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <PageTitle
        title="Create a New League"
        subtitle="Fill out the league settings form to create a new league"
      >
        <div className="mb-4">
          <div className="flex items-start gap-3 bg-emerald-50/80 border border-emerald-200 rounded-lg p-4">
            <Info className="text-emerald-700 mt-1" size={22} />
            <div>
              <p className="text-emerald-900 font-medium">
                Creating a league will cost{" "}
                <span className="font-bold">1 league credit</span>. If you do
                not have any league credits, your league will not be created.
              </p>
              <p className="text-emerald-800 mt-1">
                Visit the{" "}
                <Link href="/credits" className="underline font-semibold">
                  credits page
                </Link>{" "}
                to add credits to your account.
              </p>
            </div>
          </div>
          <div className="mt-2">
            <Badge className="bg-gradient-to-br from-yellow-900/80 to-yellow-700/80 border-2 border-yellow-400 shadow-md hover:shadow-xl">
              Current league credits: {user?.leagueCredits}
            </Badge>
          </div>
        </div>
      </PageTitle>

      {/* Create form */}
      <div className="flex mt-6">
        <Card className="w-full bg-gradient-to-br from-emerald-900/90 to-gray-900/90 border-2 border-emerald-800 text-emerald-100 p-3">
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription className="text-red-700 font-semibold text-base">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <AlertDescription className="text-green-800 font-semibold text-base">
                  {success}
                </AlertDescription>
              </Alert>
            )}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-10 divide-y divide-emerald-100"
            >
              {/* League Name & Size */}
              <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label
                    className="text-emerald-300 font-semibold"
                    htmlFor="name"
                  >
                    League Name
                  </Label>
                  <Input
                    className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 mt-1"
                    id="name"
                    {...register("name", {
                      required: "League name is required",
                    })}
                    maxLength={50}
                  />
                  {errors.name && (
                    <span className="block mt-1 text-sm text-red-600 font-semibold">
                      {errors.name.message as string}
                    </span>
                  )}
                </div>
                <div>
                  <Label
                    className="text-emerald-300 font-semibold"
                    htmlFor="leagueSize"
                  >
                    League Size
                  </Label>
                  <Input
                    className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 transition mt-1"
                    id="leagueSize"
                    type="number"
                    {...register("leagueSize", {
                      required: true,
                    })}
                  />
                </div>
              </div>
              {/* Join Code */}
              <div className="pt-8">
                <Label
                  className="text-emerald-300 font-semibold"
                  htmlFor="joinCode"
                >
                  Join Code (optional)
                </Label>
                <Input
                  className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 transition mt-1"
                  id="joinCode"
                  {...register("joinCode")}
                  maxLength={50}
                  placeholder="Set a join code for your league (optional)"
                />
              </div>
              {/* Draft Date/Time/Location */}
              <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label
                    className="text-emerald-300 font-semibold"
                    htmlFor="draftDate"
                  >
                    Draft Date
                  </Label>
                  <Input
                    className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 transition mt-1"
                    id="draftDate"
                    type="date"
                    {...register("draftDate")}
                  />
                </div>
                <div>
                  <Label
                    className="text-emerald-300 font-semibold"
                    htmlFor="draftTime"
                  >
                    Draft Time
                  </Label>
                  <Input
                    className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 transition mt-1"
                    id="draftTime"
                    type="time"
                    {...register("draftTime")}
                  />
                </div>
                <div>
                  <Label
                    className="text-emerald-300 font-semibold"
                    htmlFor="draftLocation"
                  >
                    Draft Location
                  </Label>
                  <Input
                    className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 transition mt-1"
                    id="draftLocation"
                    {...register("draftLocation")}
                    maxLength={100}
                  />
                </div>
              </div>
              {/* Roster Settings */}
              <div className="pt-8">
                <div className="mb-2 flex items-center gap-2">
                  <UserPlus className="text-emerald-700" size={20} />
                  <h2 className="text-lg font-bold text-emerald-300">
                    Roster Settings
                  </h2>
                </div>
                <p className="text-sm text-gray-200 mb-4">
                  Configure your league&apos;s roster positions.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <Label
                      className="text-emerald-300 font-semibold"
                      htmlFor="qbSlots"
                    >
                      QB
                    </Label>
                    <Input
                      className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 transition mt-1"
                      id="qbSlots"
                      type="number"
                      min={0}
                      max={5}
                      {...register("qbSlots", {
                        required: true,
                        min: 0,
                        max: 5,
                      })}
                    />
                  </div>
                  <div>
                    <Label
                      className="text-emerald-300 font-semibold"
                      htmlFor="rbSlots"
                    >
                      RB
                    </Label>
                    <Input
                      className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 transition mt-1"
                      id="rbSlots"
                      type="number"
                      min={0}
                      max={5}
                      {...register("rbSlots", {
                        required: true,
                        min: 0,
                        max: 5,
                      })}
                    />
                  </div>
                  <div>
                    <Label
                      className="text-emerald-300 font-semibold"
                      htmlFor="wrSlots"
                    >
                      WR
                    </Label>
                    <Input
                      className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 transition mt-1"
                      id="wrSlots"
                      type="number"
                      min={0}
                      max={5}
                      {...register("wrSlots", {
                        required: true,
                        min: 0,
                        max: 5,
                      })}
                    />
                  </div>
                  <div>
                    <Label
                      className="text-emerald-300 font-semibold"
                      htmlFor="teSlots"
                    >
                      TE
                    </Label>
                    <Input
                      className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 transition mt-1"
                      id="teSlots"
                      type="number"
                      min={0}
                      max={3}
                      {...register("teSlots", {
                        required: true,
                        min: 0,
                        max: 3,
                      })}
                    />
                  </div>
                  <div>
                    <Label
                      className="text-emerald-300 font-semibold"
                      htmlFor="flexSlots"
                    >
                      FLEX
                    </Label>
                    <Input
                      className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 transition mt-1"
                      id="flexSlots"
                      type="number"
                      min={0}
                      max={3}
                      {...register("flexSlots", {
                        required: true,
                        min: 0,
                        max: 3,
                      })}
                    />
                  </div>
                  <div>
                    <Label
                      className="text-emerald-300 font-semibold"
                      htmlFor="dstSlots"
                    >
                      D/ST
                    </Label>
                    <Input
                      className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 transition mt-1"
                      id="dstSlots"
                      type="number"
                      min={0}
                      max={2}
                      {...register("dstSlots", {
                        required: true,
                        min: 0,
                        max: 2,
                      })}
                    />
                  </div>
                  <div>
                    <Label
                      className="text-emerald-300 font-semibold"
                      htmlFor="kSlots"
                    >
                      K
                    </Label>
                    <Input
                      className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 transition mt-1"
                      id="kSlots"
                      type="number"
                      min={0}
                      max={2}
                      {...register("kSlots", {
                        required: true,
                        min: 0,
                        max: 2,
                      })}
                    />
                  </div>
                  <div>
                    <Label
                      className="text-emerald-300 font-semibold"
                      htmlFor="benchSlots"
                    >
                      Bench
                    </Label>
                    <Input
                      className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 transition mt-1"
                      id="benchSlots"
                      type="number"
                      min={1}
                      max={15}
                      {...register("benchSlots", {
                        required: true,
                        min: 1,
                        max: 15,
                      })}
                    />
                  </div>
                </div>
              </div>
              {/* Draft Type, Timer */}
              <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-emerald-300 font-semibold mb-2 block">
                    Nomination Type
                  </Label>
                  <div className="flex gap-4 mt-2">
                    <label className="text-emerald-300 flex items-center gap-2 font-medium">
                      <Input
                        className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 transition"
                        type="radio"
                        value="snake"
                        {...register("draftType")}
                        defaultChecked
                      />
                      Snake
                    </label>
                    <label className="text-emerald-300 flex items-center gap-2 font-medium">
                      <Input
                        className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 transition"
                        type="radio"
                        value="linear"
                        {...register("draftType")}
                      />
                      Linear
                    </label>
                  </div>
                </div>
                <div>
                  <Label className="text-emerald-300 font-semibold mb-2 block">
                    Bidding Timer
                  </Label>
                  <Controller
                    name="timerEnabled"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center gap-2 mt-2">
                        <Switch
                          id="timerEnabled"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <span className="text-emerald-300 font-medium">
                          {field.value ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    )}
                  />
                  {timerEnabled && (
                    <div className="mt-2">
                      <Label
                        className="text-emerald-300 font-semibold"
                        htmlFor="timerDuration"
                      >
                        Timer Duration (seconds)
                      </Label>
                      <Input
                        className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50 transition mt-1"
                        id="timerDuration"
                        type="number"
                        min={30}
                        max={300}
                        {...register("timerDuration", {
                          required: timerEnabled,
                          min: 30,
                          max: 300,
                        })}
                      />
                      {errors.timerDuration && (
                        <span className="block mt-1 text-sm text-red-600 font-semibold">
                          Timer must be 30-300 seconds
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-8">
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="bg-gradient-to-br from-emerald-900/80 to-emerald-700/80 border-2 border-emerald-400 shadow-md hover:shadow-xl hover:bg-emerald-800/80 transition-transform"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5 mr-2 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        ></path>
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Create League <Plus />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
