import React, { useEffect, useState } from 'react';
import JobDetailsView from "./JobDetailsView"

import { useAuth } from '../context/auth-context';

const mockJobDetails = {
  title: "Lenskart",
  id: "1",
  date: "2022-09-01",
  role: "Full Stack Developer",
  description: "Examines raw materials, work-in-progress, and finished products, Identifies defects and inconsistencies, Conducts measurements and tests, Maintains quality records, Recommends improvements to production processes",
  address: "Industrial Plot Bearing No.SP-9, 10 and 11 Industrial Area Kaharani, Bhiwadi Extension, DISTRICT ALWAR Rajasthan",
  timeSlots: [
    "9:00 AM - 12:00 PM",
    "2:00 PM - 5:00 PM",
    "6:00 PM - 9:00 PM"
  ]
};

const Dashboard = () => {
  const { user, fetchJobDetails } = useAuth();
  const [jobDetails, setJobDetails] = useState({
    title: "",
    id: "",
    role: "",
    description: "",
    address: "",
    // date: "",
    timeSlots: []
  });

  const fetchJob = async () => {
    try {
      const JobDetails = await fetchJobDetails();
    //  console.log(JobDetails.jobs[0]);
      setJobDetails(prevState => {
        const newState = {
          description: JobDetails.jobs[0].description,
          title: "Welcome Back to Lenskart",
          role: user?.department || "Eyeware",
          address: JobDetails.jobs[0].address,
          timeSlots: JobDetails.jobs[0].shiftTimings,
          id: JobDetails.jobs[0]._id,
          date: JobDetails.jobs[0].date
        };
       // console.log("New state being set:", newState);
    
        return newState;
      });
    } catch (error) {
      console.error('Failed to fetch job details:', error);
    }
  };

  useEffect(() => {
    fetchJob();
  }, []);

  return (
    <div className=" h-screen overflow-y-auto pt-16">  {/* Tailwind classes for scrollable container */}
      <JobDetailsView 
        jobDetails={jobDetails || mockJobDetails} 
        selectedSlot={user?.selectedSlot} 
      />

    </div>
  );
};

export default Dashboard;
