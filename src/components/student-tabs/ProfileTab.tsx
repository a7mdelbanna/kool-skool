import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Student } from "../StudentCard";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Course } from "@/integrations/supabase/client";

const formSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().optional(),
  lessonType: z.enum(["individual", "group"]),
  ageGroup: z.enum(["adult", "kid"]),
  courseName: z.string(),
  level: z.enum(["beginner", "intermediate", "advanced", "fluent"]),
  teacherId: z.string().optional(),
  password: z.string().optional(),
  createPassword: z.boolean().optional(),
});

interface ProfileTabProps {
  studentData: Partial<Student>;
  setStudentData: (data: Partial<Student>) => void;
  isViewMode: boolean;
  password?: string;
  setPassword?: (password: string) => void;
  createPassword?: boolean;
  setCreatePassword?: (create: boolean) => void;
  isNewStudent?: boolean;
  courses?: Course[];
  teachers?: any[];
  isLoading?: boolean;
}

const ProfileTab: React.FC<ProfileTabProps> = ({
  studentData,
  setStudentData,
  isViewMode,
  password = "",
  setPassword,
  createPassword = true,
  setCreatePassword,
  isNewStudent = false,
  courses = [],
  teachers = [],
  isLoading = false,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: studentData.firstName || "",
      lastName: studentData.lastName || "",
      email: studentData.email || "",
      phone: studentData.phone || "",
      lessonType: studentData.lessonType || "individual",
      ageGroup: studentData.ageGroup || "adult",
      courseName: studentData.courseName || "",
      level: studentData.level || "beginner",
      teacherId: studentData.teacherId || "",
      password: password || "",
      createPassword: createPassword,
    },
  });

  useEffect(() => {
    if (
      studentData.firstName !== form.getValues().firstName ||
      studentData.lastName !== form.getValues().lastName ||
      studentData.email !== form.getValues().email ||
      studentData.phone !== form.getValues().phone ||
      studentData.lessonType !== form.getValues().lessonType ||
      studentData.ageGroup !== form.getValues().ageGroup ||
      studentData.courseName !== form.getValues().courseName ||
      studentData.level !== form.getValues().level ||
      studentData.teacherId !== form.getValues().teacherId ||
      password !== form.getValues().password ||
      createPassword !== form.getValues().createPassword
    ) {
      form.reset({
        firstName: studentData.firstName || "",
        lastName: studentData.lastName || "",
        email: studentData.email || "",
        phone: studentData.phone || "",
        lessonType: studentData.lessonType || "individual",
        ageGroup: studentData.ageGroup || "adult",
        courseName: studentData.courseName || "",
        level: studentData.level || "beginner",
        teacherId: studentData.teacherId || "",
        password: password || "",
        createPassword: createPassword,
      });
    }
  }, [studentData, password, createPassword, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setStudentData({
      ...studentData,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      lessonType: values.lessonType,
      ageGroup: values.ageGroup,
      courseName: values.courseName,
      level: values.level,
      teacherId: values.teacherId,
    });
    
    if (setPassword && values.password !== undefined) {
      setPassword(values.password);
    }
    
    if (setCreatePassword && values.createPassword !== undefined) {
      setCreatePassword(values.createPassword);
    }
  };

  useEffect(() => {
    const subscription = form.watch(() => {});
    return () => subscription.unsubscribe();
  }, [form]);

  const handleFormBlur = () => {
    const values = form.getValues();
    const isValid = form.formState.isValid;
    
    if (isValid) {
      onSubmit(values);
    }
  };

  useEffect(() => {
    console.log('Teachers data in ProfileTab:', teachers);
    if (teachers && teachers.length > 0) {
      teachers.forEach((teacher, index) => {
        console.log(`Teacher ${index + 1} details:`, teacher);
        console.log(`  Display name: ${teacher.display_name}`);
        console.log(`  First name: ${teacher.first_name}`);
        console.log(`  Last name: ${teacher.last_name}`);
      });
    }
  }, [teachers]);

  return (
    <Form {...form}>
      <form 
        className="space-y-6" 
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit(onSubmit)(e);
        }}
        onBlur={handleFormBlur}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>
            
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name*</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="First name" 
                      {...field} 
                      disabled={isViewMode}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name*</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Last name" 
                      {...field} 
                      disabled={isViewMode}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email*</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="email@example.com" 
                      {...field} 
                      disabled={isViewMode}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Phone number" 
                      {...field} 
                      value={field.value || ""}
                      disabled={isViewMode}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {isNewStudent && (
              <>
                <FormField
                  control={form.control}
                  name="createPassword"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (setCreatePassword) {
                              setCreatePassword(checked === true);
                            }
                          }}
                          disabled={isViewMode}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Create account with password</FormLabel>
                        <FormDescription>
                          Student will be able to log in to their account
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                {form.watch("createPassword") && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password*</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter password" 
                            {...field} 
                            disabled={isViewMode}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Course Information</h3>
            
            <FormField
              control={form.control}
              name="courseName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course*</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value} 
                    value={field.value}
                    disabled={isViewMode || isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoading ? (
                        <SelectItem value="loading">Loading courses...</SelectItem>
                      ) : courses.length > 0 ? (
                        courses.map((course) => (
                          <SelectItem key={course.id} value={course.name}>
                            {course.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-courses">No courses available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lessonType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Lesson Type*</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                      className="flex space-x-4"
                      disabled={isViewMode}
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="individual" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Individual
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="group" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Group
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="ageGroup"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Age Group*</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                      className="flex space-x-4"
                      disabled={isViewMode}
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="adult" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Adult
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="kid" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Kid
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Level*</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value} 
                    value={field.value}
                    disabled={isViewMode}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="fluent">Fluent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="teacherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teacher</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value} 
                    value={field.value || ""}
                    disabled={isViewMode || isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a teacher" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoading ? (
                        <SelectItem value="loading">Loading teachers...</SelectItem>
                      ) : teachers && teachers.length > 0 ? (
                        teachers.map((teacher) => {
                          console.log(`Rendering teacher option: ${teacher.display_name} (${teacher.id})`);
                          return (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.display_name || `${teacher.first_name} ${teacher.last_name}` || teacher.id}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem value="no-teachers">No teachers available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </form>
    </Form>
  );
};

export default ProfileTab;
