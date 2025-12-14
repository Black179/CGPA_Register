import { useState, useEffect } from 'react';
import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, VStack, Text, Button, useToast, HStack } from '@chakra-ui/react';

const AdminDashboard = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      console.log('Fetching students from API...');
      const response = await fetch('http://localhost:5000/api/admin/students');
      const data = await response.json();
      console.log('Received data:', data);
      setStudents(data);
      console.log('Students set:', data.length);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch student data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalStudents = students.length;
    const totalSemesters = students.reduce((sum, student) => sum + (student?.semesters?.length || 0), 0);
    const avgCGPA = students.length > 0 
      ? (students.reduce((sum, student) => {
          if (!student?.semesters || student.semesters.length === 0) return sum;
          const totalCredits = student.semesters.reduce((creditSum, sem) => 
            creditSum + (sem.subjects?.reduce((subjectSum, subject) => subjectSum + subject.credits, 0) || 0), 0);
          const weightedSum = student.semesters.reduce((weightSum, sem) => 
            weightSum + (sem.sgpa * totalCredits), 0);
          return sum + (totalCredits > 0 ? weightedSum / totalCredits : 0);
        }, 0) / students.length)
      : 0;

    return { totalStudents, totalSemesters, avgCGPA };
  };

  // Function to flatten all subjects from all students and semesters
  const getAllSubjects = () => {
    const allSubjects = [];
    console.log('Processing students:', students.length);
    
    students.filter(student => student !== null).forEach(student => {
      console.log('Processing student:', student?.name);
      if (student?.semesters) {
        student.semesters.forEach(semester => {
          console.log('Processing semester:', semester?.semesterNo);
          if (semester?.subjects) {
            semester.subjects.forEach(subject => {
              const subjectData = {
                studentName: student?.name || 'N/A',
                registerNo: student?.registerNo || 'N/A',
                section: student?.section || 'N/A',
                semesterNo: semester?.semesterNo || 'N/A',
                ...subject
              };
              console.log('Adding subject:', subjectData);
              allSubjects.push(subjectData);
            });
          }
        });
      }
    });
    console.log('Total subjects processed:', allSubjects.length);
    return allSubjects;
  };

  const addTestData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/test-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Test data added successfully!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchStudents(); // Refresh the data
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to add test data',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error adding test data:', error);
      toast({
        title: 'Error',
        description: 'Failed to add test data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const allSubjects = getAllSubjects();

  if (loading) {
    return (
      <Box p={8}>
        <Text textAlign="center">Loading student data...</Text>
      </Box>
    );
  }

  const stats = calculateStats();

  return (
    <VStack spacing={6} p={6}>
      <Heading size="2xl" textAlign="center" color="blue.600">
        Admin Dashboard
      </Heading>

      {/* Statistics Cards */}
      <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={4} mb={6}>
        <Box p={4} borderRadius="8px" bg="white" boxShadow="0 2px 4px rgba(0,0,0,0.1)">
          <Text fontSize="lg" fontWeight="bold" color="blue.600">
            {stats.totalStudents}
          </Text>
          <Text fontSize="sm" color="gray.600">Total Students</Text>
        </Box>
        
        <Box p={4} borderRadius="8px" bg="white" boxShadow="0 2px 4px rgba(0,0,0,0.1)">
          <Text fontSize="lg" fontWeight="bold" color="green.600">
            {stats.totalSemesters}
          </Text>
          <Text fontSize="sm" color="gray.600">Total Semesters</Text>
        </Box>
        
        <Box p={4} borderRadius="8px" bg="white" boxShadow="0 2px 4px rgba(0,0,0,0.1)">
          <Text fontSize="lg" fontWeight="bold" color="purple.600">
            {stats.avgCGPA.toFixed(2)}
          </Text>
          <Text fontSize="sm" color="gray.600">Average CGPA</Text>
        </Box>
      </Box>

      {/* Students Table */}
      <Box bg="white" borderRadius="8px" p={6} boxShadow="0 2px 4px rgba(0,0,0,0.1)">
        <Heading size="lg" mb={4} color="gray.800">
          Student Subject Records
        </Heading>
        
        {allSubjects.length === 0 ? (
          <Text textAlign="center" color="gray.500" py={8}>
            No subject records found in the database.
          </Text>
        ) : (
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Student Name</Th>
                  <Th>Register No</Th>
                  <Th>Section</Th>
                  <Th>Semester</Th>
                  <Th>Subject Code</Th>
                  <Th>Subject Name</Th>
                  <Th>Credits</Th>
                  <Th>Grade</Th>
                  <Th>Grade Point</Th>
                </Tr>
              </Thead>
              <Tbody>
                {allSubjects.map((subject, index) => (
                  <Tr key={`${subject.registerNo}-${subject.semesterNo}-${subject.code}-${index}`}>
                    <Td>{subject.studentName}</Td>
                    <Td>{subject.registerNo}</Td>
                    <Td>{subject.section}</Td>
                    <Td>Semester {subject.semesterNo}</Td>
                    <Td>{subject.code}</Td>
                    <Td>{subject.name}</Td>
                    <Td>{subject.credits}</Td>
                    <Td>{subject.grade}</Td>
                    <Td>{subject.gradePoint}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        <HStack spacing={4} mt={4}>
        <Button 
          onClick={fetchStudents}
          colorScheme="blue" 
          variant="outline"
        >
          Refresh Data
        </Button>
        
        <Button 
          onClick={addTestData}
          colorScheme="green" 
          variant="solid"
        >
          Add Test Data
        </Button>
      </HStack>
      </Box>
    </VStack>
  );
};

export default AdminDashboard;
