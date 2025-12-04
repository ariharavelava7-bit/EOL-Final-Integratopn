import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiPhone, FiMapPin, FiEdit2, FiSave, FiX, FiCalendar, FiBriefcase } from 'react-icons/fi';
import './Profile.css';

function Profile() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Harish M';
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    fullName: 'Harish M',
    email: 'harish.m_ext@ltts.com',
    phone: '+91 90000 00000',
    department: 'IMB-MAC & EDP Common',
    designation: 'Intern',
    location: 'Chennai, India',
    employeeId: 'LT-CORe-INTERN-2025',
    joinDate: '2025-10-06'
  });

  const handleInputChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    // Save profile data
    setIsEditing(false);
    // In real app, save to backend
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reload original data
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <h2>Profile</h2>
        <p>Manage your professional identity within L&T-CORe</p>
      </div>

      <div className="profile-container">
        <div className="card profile-card">
          <div className="profile-header">
            <div className="profile-avatar-large">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="profile-header-info">
              <h3>{profile.fullName}</h3>
              <p className="profile-designation">{profile.designation}</p>
              <p className="profile-department">{profile.department}</p>
            </div>
            <div className="profile-actions">
              {isEditing ? (
                <>
                  <button className="btn btn-success btn-icon" onClick={handleSave}>
                    <FiSave /> Save
                  </button>
                  <button className="btn btn-secondary btn-icon" onClick={handleCancel}>
                    <FiX /> Cancel
                  </button>
                </>
              ) : (
                <button className="btn btn-primary btn-icon" onClick={() => setIsEditing(true)}>
                  <FiEdit2 /> Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="profile-content">
            <div className="profile-summary-grid">
              <div className="profile-summary-card">
                <FiBriefcase className="summary-icon" />
                <div>
                  <span className="summary-label">Department</span>
                  <span className="summary-value">{profile.department}</span>
                </div>
              </div>
              <div className="profile-summary-card">
                <FiCalendar className="summary-icon" />
                <div>
                  <span className="summary-label">Joined</span>
                  <span className="summary-value">{new Date(profile.joinDate).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="profile-summary-card">
                <FiUser className="summary-icon" />
                <div>
                  <span className="summary-label">Role</span>
                  <span className="summary-value">{profile.designation}</span>
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h4>Personal Information</h4>
              <div className="profile-grid">
                <div className="profile-field">
                  <label>
                    <FiUser /> Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className="input-field"
                    />
                  ) : (
                    <div className="profile-value">{profile.fullName}</div>
                  )}
                </div>

                <div className="profile-field">
                  <label>
                    <FiMail /> Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="input-field"
                    />
                  ) : (
                    <div className="profile-value">{profile.email}</div>
                  )}
                </div>

                <div className="profile-field">
                  <label>
                    <FiPhone /> Phone
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="input-field"
                    />
                  ) : (
                    <div className="profile-value">{profile.phone}</div>
                  )}
                </div>

                <div className="profile-field">
                  <label>
                    <FiMapPin /> Location
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="input-field"
                    />
                  ) : (
                    <div className="profile-value">{profile.location}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h4>Professional Information</h4>
              <div className="profile-grid">
                <div className="profile-field">
                  <label>Employee ID</label>
                  <div className="profile-value">{profile.employeeId}</div>
                </div>

                <div className="profile-field">
                  <label>Designation</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.designation}
                      onChange={(e) => handleInputChange('designation', e.target.value)}
                      className="input-field"
                    />
                  ) : (
                    <div className="profile-value">{profile.designation}</div>
                  )}
                </div>

                <div className="profile-field">
                  <label>Department</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className="input-field"
                    />
                  ) : (
                    <div className="profile-value">{profile.department}</div>
                  )}
                </div>

                <div className="profile-field">
                  <label>Join Date</label>
                  <div className="profile-value">{new Date(profile.joinDate).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;

