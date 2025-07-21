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
    <>
      <PageTitle
        title="Create a New League"
        subtitle="Fill our the league settings form to create a new league"
      >
        <p className="max-w-xl text-gray-300 italic font-exo2">
          Please note, creating a league will cost 1 league credit. If you do
          not have any league credits, your league will not be created. Please
          visit the{" "}
          <Link href="/credits" className="underline">
            credits page
          </Link>{" "}
          to add credits to your account.
        </p>
        <div className="font-exo2 text-yellow-600">{`Current league credits: ${user?.leagueCredits}`}</div>
      </PageTitle>

      {/* Create form */}
      <div className="flex mt-12">
        <Card className="w-full max-w-3xl bg-transparent p-6 border-none shadow-none">
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  {success}
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* League Name & Size */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-50" htmlFor="name">
                    League Name
                  </Label>
                  <Input
                    className="bg-gray-200"
                    id="name"
                    {...register("name", {
                      required: "League name is required",
                    })}
                    maxLength={50}
                  />
                  {errors.name && (
                    <span className="text-xs text-destructive">
                      {errors.name.message as string}
                    </span>
                  )}
                </div>
                <div>
                  <Label className="text-gray-50" htmlFor="leagueSize">
                    League Size
                  </Label>
                  <Input
                    className="bg-gray-200"
                    id="leagueSize"
                    type="number"
                    {...register("leagueSize", {
                      required: true,
                    })}
                  />
                </div>
              </div>
              {/* Join Code */}
              <div className="mt-4">
                <Label className="text-gray-50" htmlFor="joinCode">
                  Join Code (optional)
                </Label>
                <Input
                  className="bg-gray-200"
                  id="joinCode"
                  {...register("joinCode")}
                  maxLength={50}
                  placeholder="Set a join code for your league (optional)"
                />
              </div>
              {/* Draft Date/Time/Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-50" htmlFor="draftDate">
                    Draft Date
                  </Label>
                  <Input
                    className="bg-gray-200"
                    id="draftDate"
                    type="date"
                    {...register("draftDate")}
                  />
                </div>
                <div>
                  <Label className="text-gray-50" htmlFor="draftTime">
                    Draft Time
                  </Label>
                  <Input
                    className="bg-gray-200"
                    id="draftTime"
                    type="time"
                    {...register("draftTime")}
                  />
                </div>
                <div>
                  <Label className="text-gray-50" htmlFor="draftLocation">
                    Draft Location
                  </Label>
                  <Input
                    className="bg-gray-200"
                    id="draftLocation"
                    {...register("draftLocation")}
                    maxLength={100}
                  />
                </div>
              </div>
              {/* Roster Settings */}
              <div>
                <Label className="text-gray-50 mb-2 block">
                  Roster Settings
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-gray-50" htmlFor="qbSlots">
                      QB
                    </Label>
                    <Input
                      className="bg-gray-200"
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
                    <Label className="text-gray-50" htmlFor="rbSlots">
                      RB
                    </Label>
                    <Input
                      className="bg-gray-200"
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
                    <Label className="text-gray-50" htmlFor="wrSlots">
                      WR
                    </Label>
                    <Input
                      className="bg-gray-200"
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
                    <Label className="text-gray-50" htmlFor="teSlots">
                      TE
                    </Label>
                    <Input
                      className="bg-gray-200"
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
                    <Label className="text-gray-50" htmlFor="flexSlots">
                      FLEX
                    </Label>
                    <Input
                      className="bg-gray-200"
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
                    <Label className="text-gray-50" htmlFor="dstSlots">
                      D/ST
                    </Label>
                    <Input
                      className="bg-gray-200"
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
                    <Label className="text-gray-50" htmlFor="kSlots">
                      K
                    </Label>
                    <Input
                      className="bg-gray-200"
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
                    <Label className="text-gray-50" htmlFor="benchSlots">
                      Bench
                    </Label>
                    <Input
                      className="bg-gray-200"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-50 mb-2 block">
                    Nomination Type
                  </Label>
                  <div className="flex gap-4 mt-2">
                    <label className="text-gray-50 flex items-center gap-2">
                      <Input
                        className="bg-gray-200"
                        type="radio"
                        value="snake"
                        {...register("draftType")}
                        defaultChecked
                      />
                      Snake
                    </label>
                    <label className="text-gray-50 flex items-center gap-2">
                      <Input
                        className="bg-gray-200"
                        type="radio"
                        value="linear"
                        {...register("draftType")}
                      />
                      Linear
                    </label>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-50 mb-2 block">
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
                        <span className="text-gray-50">
                          {field.value ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    )}
                  />
                  {timerEnabled && (
                    <div className="mt-2">
                      <Label className="text-gray-50" htmlFor="timerDuration">
                        Timer Duration (seconds)
                      </Label>
                      <Input
                        className="bg-gray-200"
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
                        <span className="text-xs text-destructive">
                          Timer must be 30-300 seconds
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="bg-emerald-900"
                >
                  {loading ? "Creating..." : "Create League"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
