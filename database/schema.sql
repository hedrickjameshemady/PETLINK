-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 14, 2026 at 03:03 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `petlink`
--

-- --------------------------------------------------------

--
-- Table structure for table `adoption_applications`
--

CREATE TABLE `adoption_applications` (
  `id` int(11) NOT NULL,
  `application_id` varchar(20) DEFAULT NULL,
  `applicant_id` int(11) NOT NULL,
  `pet_id` int(11) NOT NULL,
  `living_situation` varchar(100) DEFAULT NULL,
  `has_yard` tinyint(1) DEFAULT 0,
  `other_pets` text DEFAULT NULL,
  `children_at_home` varchar(50) DEFAULT NULL,
  `experience_with_pets` text DEFAULT NULL,
  `reason_for_adoption` text DEFAULT NULL,
  `preferred_contact` varchar(50) DEFAULT NULL,
  `status` enum('Pending Review','Approved','Rejected','Cancelled') DEFAULT 'Pending Review',
  `reviewed_by` int(11) DEFAULT NULL,
  `review_notes` text DEFAULT NULL,
  `applied_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `behavioral_assessments`
--

CREATE TABLE `behavioral_assessments` (
  `id` int(11) NOT NULL,
  `pet_id` int(11) NOT NULL,
  `assessed_by` int(11) DEFAULT NULL,
  `traits` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`traits`)),
  `description` text DEFAULT NULL,
  `compatibility_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `campaigns`
--

CREATE TABLE `campaigns` (
  `id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `type` enum('Event','Campaign','Drive','Fundraiser') DEFAULT 'Event',
  `description` text DEFAULT NULL,
  `target_amount` decimal(10,2) DEFAULT NULL,
  `raised_amount` decimal(10,2) DEFAULT 0.00,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `status` enum('Upcoming','Active','Completed','Cancelled') DEFAULT 'Upcoming',
  `banner_image` varchar(255) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `campaign_participants`
--

CREATE TABLE `campaign_participants` (
  `id` int(11) NOT NULL,
  `campaign_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `donations`
--

CREATE TABLE `donations` (
  `id` int(11) NOT NULL,
  `donor_id` int(11) DEFAULT NULL,
  `donor_name` varchar(200) DEFAULT NULL,
  `donor_email` varchar(255) DEFAULT NULL,
  `donor_phone` varchar(20) DEFAULT NULL,
  `type` enum('Individual','Organization','Anonymous') DEFAULT 'Individual',
  `amount` decimal(10,2) NOT NULL,
  `purpose` varchar(200) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `transaction_ref` varchar(100) DEFAULT NULL,
  `donated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `campaign_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `feedback`
--

CREATE TABLE `feedback` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(200) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `subject` varchar(200) DEFAULT NULL,
  `message` text NOT NULL,
  `rating` int(11) DEFAULT NULL CHECK (`rating` between 1 and 5),
  `status` enum('New','Read','Responded') DEFAULT 'New',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lost_found_reports`
--

CREATE TABLE `lost_found_reports` (
  `id` int(11) NOT NULL,
  `report_id` varchar(20) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `reporter_name` varchar(200) NOT NULL,
  `reporter_email` varchar(255) NOT NULL,
  `reporter_phone` varchar(20) DEFAULT NULL,
  `type` enum('Lost','Found') NOT NULL,
  `pet_name` varchar(100) DEFAULT NULL,
  `pet_description` text NOT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `last_seen_location` varchar(255) DEFAULT NULL,
  `status` enum('Pending Review','Approved','Reunited','Closed') DEFAULT 'Pending Review',
  `reviewed_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(200) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `type` enum('adoption','volunteer','donation','general') DEFAULT 'general',
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pets`
--

CREATE TABLE `pets` (
  `id` int(11) NOT NULL,
  `pet_id` varchar(20) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('Dog','Cat','Bird','Rabbit','Other') NOT NULL,
  `breed` varchar(100) DEFAULT NULL,
  `age_years` int(11) DEFAULT NULL,
  `age_months` int(11) DEFAULT NULL,
  `gender` enum('Male','Female') NOT NULL,
  `color` varchar(100) DEFAULT NULL,
  `weight` decimal(5,2) DEFAULT NULL,
  `health_status` enum('Excellent','Good','Fair','Poor') DEFAULT 'Good',
  `vaccination_status` tinyint(1) DEFAULT 0,
  `neutered` tinyint(1) DEFAULT 0,
  `microchipped` tinyint(1) DEFAULT 0,
  `status` enum('Available','Pending','Adopted','Not Available') DEFAULT 'Available',
  `description` text DEFAULT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `intake_date` date DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `role` enum('user','staff','admin') DEFAULT 'user',
  `profile_photo` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `volunteers`
--

CREATE TABLE `volunteers` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `availability` enum('Weekdays','Weekends','Both','Flexible') DEFAULT 'Flexible',
  `preferred_role` varchar(100) DEFAULT NULL,
  `role` varchar(100) DEFAULT NULL,
  `experience` text DEFAULT NULL,
  `status` enum('Active','Inactive','Pending') DEFAULT 'Pending',
  `start_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `volunteer_applications`
--

CREATE TABLE `volunteer_applications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `availability` enum('Weekdays','Weekends','Both','Flexible') DEFAULT NULL,
  `preferred_role` varchar(100) DEFAULT NULL,
  `motivation` text DEFAULT NULL,
  `experience` text DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `reviewed_by` int(11) DEFAULT NULL,
  `applied_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `adoption_applications`
--
ALTER TABLE `adoption_applications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `application_id` (`application_id`),
  ADD KEY `applicant_id` (`applicant_id`),
  ADD KEY `pet_id` (`pet_id`),
  ADD KEY `reviewed_by` (`reviewed_by`);

--
-- Indexes for table `behavioral_assessments`
--
ALTER TABLE `behavioral_assessments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pet_id` (`pet_id`),
  ADD KEY `assessed_by` (`assessed_by`);

--
-- Indexes for table `campaigns`
--
ALTER TABLE `campaigns`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `campaign_participants`
--
ALTER TABLE `campaign_participants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_participant` (`campaign_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `donations`
--
ALTER TABLE `donations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `donor_id` (`donor_id`),
  ADD KEY `campaign_id` (`campaign_id`);

--
-- Indexes for table `feedback`
--
ALTER TABLE `feedback`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `lost_found_reports`
--
ALTER TABLE `lost_found_reports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `report_id` (`report_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `reviewed_by` (`reviewed_by`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `pets`
--
ALTER TABLE `pets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `pet_id` (`pet_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `volunteers`
--
ALTER TABLE `volunteers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `volunteer_applications`
--
ALTER TABLE `volunteer_applications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `reviewed_by` (`reviewed_by`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `adoption_applications`
--
ALTER TABLE `adoption_applications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `behavioral_assessments`
--
ALTER TABLE `behavioral_assessments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `campaigns`
--
ALTER TABLE `campaigns`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `campaign_participants`
--
ALTER TABLE `campaign_participants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `donations`
--
ALTER TABLE `donations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `feedback`
--
ALTER TABLE `feedback`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lost_found_reports`
--
ALTER TABLE `lost_found_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pets`
--
ALTER TABLE `pets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `volunteers`
--
ALTER TABLE `volunteers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `volunteer_applications`
--
ALTER TABLE `volunteer_applications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `adoption_applications`
--
ALTER TABLE `adoption_applications`
  ADD CONSTRAINT `adoption_applications_ibfk_1` FOREIGN KEY (`applicant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `adoption_applications_ibfk_2` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `adoption_applications_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `behavioral_assessments`
--
ALTER TABLE `behavioral_assessments`
  ADD CONSTRAINT `behavioral_assessments_ibfk_1` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `behavioral_assessments_ibfk_2` FOREIGN KEY (`assessed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `campaigns`
--
ALTER TABLE `campaigns`
  ADD CONSTRAINT `campaigns_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `campaign_participants`
--
ALTER TABLE `campaign_participants`
  ADD CONSTRAINT `campaign_participants_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `campaign_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `donations`
--
ALTER TABLE `donations`
  ADD CONSTRAINT `donations_ibfk_1` FOREIGN KEY (`donor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `donations_ibfk_2` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `feedback`
--
ALTER TABLE `feedback`
  ADD CONSTRAINT `feedback_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `lost_found_reports`
--
ALTER TABLE `lost_found_reports`
  ADD CONSTRAINT `lost_found_reports_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `lost_found_reports_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pets`
--
ALTER TABLE `pets`
  ADD CONSTRAINT `pets_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `volunteers`
--
ALTER TABLE `volunteers`
  ADD CONSTRAINT `volunteers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `volunteer_applications`
--
ALTER TABLE `volunteer_applications`
  ADD CONSTRAINT `volunteer_applications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `volunteer_applications_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
